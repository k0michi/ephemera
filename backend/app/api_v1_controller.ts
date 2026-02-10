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
import { pipeline } from 'node:stream/promises';
import { fileTypeFromFile } from 'file-type';
import fsPromises from 'fs/promises';

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

  async validateType(filePath: string, expectedMimeType: string): Promise<void> {
    const detectedType = await fileTypeFromFile(filePath);

    if (detectedType?.mime !== expectedMimeType) {
      throw new ApiError('Attachment MIME type mismatch', 400);
    }
  }

  async handlePost(req: express.Request, res: express.Response) {
    const files = req.files as Express.Multer.File[];

    try {
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

      for (const file of files) {
        await this.validateType(file.path, file.mimetype);
      }

      const paths = files.map((file) => file.path);
      await this.postService.create(parsed.post, paths);

      res.status(200).json({});
    } finally {
      await Promise.allSettled(files.map((file) => fsPromises.unlink(file.path)));
    }
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

    await using file = await this.attachmentService.open(hash);
    const type = await this.attachmentService.getType(hash);

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename=${hash}.${type.ext}`);
    res.setHeader('Content-Type', type.type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    await pipeline(
      file.createReadStream(),
      res
    );
  }
}