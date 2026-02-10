import express from 'express';
import { deletePostRequestSchema, deletePostSignalSchema, getPostsRequestSchema, postRequestSchema } from '@ephemera/shared/api/api_schema.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import { type IController } from '../lib/controller.js';
import type Config from './config.js';
import type { IPostService, PostFindOptions } from './post_service.js';
import { ApiError } from './api_error.js';
import type { GetPostsResponse } from '@ephemera/shared/api/api.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import multer from 'multer';
import type { IAttachmentService } from './attachment_service.js';
import Base37 from '@ephemera/shared/lib/base37.js';
import Hex from '@ephemera/shared/lib/hex.js';
import ArrayHelper from '@ephemera/shared/lib/array_helper.js';

export default class ApiV1Controller implements IController {
  public path = '/api/v1';
  public router = express.Router();
  private config: Config;
  private postService: IPostService;
  private attachmentService: IAttachmentService;
  private upload = multer({
    dest: './uploads/'
  });

  constructor(config: Config, postService: IPostService, attachmentService: IAttachmentService) {
    this.config = config;
    this.postService = postService;
    this.attachmentService = attachmentService;

    this.router.post('/post', this.upload.array('attachments', 4), this.handlePost.bind(this));
    this.router.get('/posts', this.handleGetPosts.bind(this));
    this.router.delete('/post', this.handleDeletePost.bind(this));
    this.router.get('/attachments/:hash', this.handleGetAttachment.bind(this));
  }

  async handlePost(req: express.Request, res: express.Response) {
    let parsed;

    let postData: any;

    if (typeof req.body.post === 'string') {
      try {
        postData = JSON.parse(req.body.post);
      } catch (e) {
        throw new ApiError('Invalid request: malformed JSON', 400);
      }
    } else {
      throw new ApiError('Invalid request: missing post data', 400);
    }

    try {
      parsed = postRequestSchema.parse({ post: postData });
    } catch (e) {
      throw new ApiError('Invalid request', 400);
    }

    const expectedAttachments = parsed.post[0][3].filter((footer) => footer[0] === 'attachment').map((footer) => footer[2]);
    const actualAttachments: string[] = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        actualAttachments.push(await this.attachmentService.fileDigest(file.path));
      }
    }

    // Check if the referenced attachments match the uploaded attachments
    if (ArrayHelper.equals(expectedAttachments.sort(), actualAttachments.sort()) === false) {
      throw new ApiError('Attachment mismatch', 400);
    }

    for (const file of req.files as Express.Multer.File[]) {
      await this.attachmentService.copyFrom(file.path, file.mimetype);
    }

    await this.postService.create(parsed.post);

    await this.attachmentService.linkPost(
      Hex.fromUint8Array(await SignalCrypto.digest(parsed.post[0])),
      actualAttachments
    );

    res.status(200).json({});
  }

  static parseInt(string: string): number {
    const result = Number.parseInt(string, 10);

    if (Number.isNaN(result)) {
      throw new ApiError('Invalid request', 400);
    }

    return result;
  }

  async handleGetPosts(req: express.Request, res: express.Response) {
    let parsed;

    try {
      parsed = getPostsRequestSchema.parse(req.query);
    } catch (e) {
      throw new ApiError('Invalid request', 400);
    }

    const kDefaultLimit = 16;
    const limit = NullableHelper.map(parsed.limit, (value) => ApiV1Controller.parseInt(value)) ?? kDefaultLimit;

    const options: PostFindOptions = {
      limit: limit,
      cursor: parsed.cursor ?? null,
      author: parsed.author ?? null,
    };

    const result = await this.postService.find(options);

    const response: GetPostsResponse = {
      posts: result.posts,
      nextCursor: result.nextCursor,
    };

    res.status(200).json(response);
  }

  async handleDeletePost(req: express.Request, res: express.Response) {
    let parsed;

    try {
      parsed = deletePostRequestSchema.parse(req.body);
    } catch (e) {
      throw new ApiError('Invalid request', 400);
    }

    await this.postService.delete(parsed.post);
    res.status(200).json({});
  }

  async handleGetAttachment(req: express.Request, res: express.Response) {
    const hash = req.params.hash;

    if (typeof hash !== 'string') {
      throw new ApiError('Invalid request', 400);
    }

    let file;
    let type;

    try {
      file = await this.attachmentService.open(hash);
      type = await this.attachmentService.getType(hash);
    } catch (e) {
      throw new ApiError('Attachment not found', 404);
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename=${hash}.${type.ext}`);
    res.setHeader('Content-Type', type.type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const readStream = file.createReadStream();
    readStream.pipe(res);
  }
}