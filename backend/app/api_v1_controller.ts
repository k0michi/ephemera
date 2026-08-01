import { pipeline } from 'node:stream/promises';

import type { GetIdentityResponse, GetPeerResponse, GetPostResponse, GetPostsResponse, GetRemoteServersResponse } from '@ephemera/shared/api/api.js';
import { deletePostRequestSchema, getIdentityRequestSchema, getPeerRequestSchema, getPostRequestSchema, getPostsRequestSchema, getRemoteServersRequestSchema, postRequestSchema } from '@ephemera/shared/api/api_schema.js';
import AttachmentUtil from '@ephemera/shared/lib/attachment_util.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import express from 'express';
import fsPromises from 'fs/promises';
import multer from 'multer';

import { type IController, type IWebSocketController } from '../lib/controller.js';
import { ApiError } from './api_error.js';
import type { IAttachmentService } from './attachment_service.js';
import type Config from './config.js';
import type { IIdentityService } from './identity_service.js';
import type { IPeerService } from './peer_service.js';
import type { IPostService, PostFindOptions } from './post_service.js';

export default class ApiV1Controller implements IController {
  public path = '/api/v1';
  public router = express.Router();
  public children: (IController | IWebSocketController)[];
  private config: Config;
  private postService: IPostService;
  private attachmentService: IAttachmentService;
  private peerService: IPeerService;
  private identityService: IIdentityService;
  private upload = multer({
    dest: './uploads/'
  });

  constructor(config: Config, identityService: IIdentityService, postService: IPostService, attachmentService: IAttachmentService, peerService: IPeerService, postStreamController: IWebSocketController) {
    this.config = config;
    this.identityService = identityService;
    this.postService = postService;
    this.attachmentService = attachmentService;
    this.peerService = peerService;
    this.children = [postStreamController];

    this.router.post('/post', this.upload.array('attachments', 4), this.handlePost.bind(this));
    this.router.get('/posts', this.handleGetPosts.bind(this));
    this.router.delete('/post', this.handleDeletePost.bind(this));
    this.router.get('/attachments/:hash', this.handleGetAttachment.bind(this));
    this.router.get('/attachments/:hash/index.m3u8', this.handleGetAttachmentVideoIndex.bind(this));
    this.router.get('/attachments/:hash/:variant.webp', this.handleGetAttachmentImage.bind(this));
    this.router.get('/attachments/:hash/:variant/:part', this.handleGetAttachmentVideoPart.bind(this));
    this.router.get('/peer', this.handleGetPeer.bind(this));
    this.router.get('/remote-servers', this.handleGetRemoteServers.bind(this));
    this.router.get('/posts/:id', this.handleGetPost.bind(this));
    this.router.post('/identity', this.handleGetIdentity.bind(this));
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

  async sendAttachment(res: express.Response, file: fsPromises.FileHandle, hash: string, type: { ext: string, type: string }, options: { disposition?: boolean } = {}) {
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (options.disposition ?? true) {
      res.setHeader('Content-Disposition', `inline; filename=${hash}.${type.ext}`);
    }

    res.setHeader('Content-Type', type.type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    await pipeline(
      file.createReadStream(),
      res
    );
  }

  async handleGetAttachment(req: express.Request, res: express.Response) {
    const hash = req.params.hash;

    if (typeof hash !== 'string') {
      throw new ApiError('Invalid request', 400);
    }

    await using file = await this.attachmentService.open(hash);
    const type = await this.attachmentService.getType(hash);
    await this.sendAttachment(res, file, hash, type);
  }

  async handleGetAttachmentImage(req: express.Request, res: express.Response) {
    const hash = req.params.hash;
    const variant = req.params.variant;

    if (typeof hash !== 'string' || typeof variant !== 'string' || !AttachmentUtil.isVariant(variant)) {
      throw new ApiError('Invalid request', 400);
    }

    await using file = await this.attachmentService.openVariant(hash, variant);
    const type = await this.attachmentService.getVariantType(hash, variant);
    await this.sendAttachment(res, file, hash, type, { disposition: false });
  }

  async handleGetAttachmentVideoIndex(req: express.Request, res: express.Response) {
    const hash = req.params.hash;

    if (typeof hash !== 'string') {
      throw new ApiError('Invalid request', 400);
    }

    await using file = await this.attachmentService.openVariant(hash, 'index');
    const type = await this.attachmentService.getVariantType(hash, 'index');
    await this.sendAttachment(res, file, hash, type, { disposition: false });
  }

  async handleGetAttachmentVideoPart(req: express.Request, res: express.Response) {
    const hash = req.params.hash;
    const variant = req.params.variant;
    const part = req.params.part;

    if (typeof hash !== 'string' || typeof variant !== 'string' || typeof part !== 'string' || !AttachmentUtil.isVariant(variant)) {
      throw new ApiError('Invalid request', 400);
    }

    await using file = await this.attachmentService.openVariant(hash, variant, part);
    const type = await this.attachmentService.getVariantType(hash, variant, part);
    await this.sendAttachment(res, file, hash, type, { disposition: false });
  }

  async handleGetPeer(req: express.Request, res: express.Response) {
    let parsed;

    try {
      parsed = getPeerRequestSchema.parse(req.query);
    } catch (e) {
      throw new ApiError('Invalid request', 400);
    }

    const response = this.peerService.getPeerDescriptor() satisfies GetPeerResponse;
    res.status(200).json(response);
  }

  async handleGetRemoteServers(req: express.Request, res: express.Response) {
    let parsed;

    try {
      parsed = getRemoteServersRequestSchema.parse(req.query);
    } catch (e) {
      throw new ApiError('Invalid request', 400);
    }

    const servers = await this.peerService.getRemoteServers();
    const response = { servers } satisfies GetRemoteServersResponse;
    res.status(200).json(response);
  }

  async handleGetPost(req: express.Request, res: express.Response) {
    let parsed;

    try {
      parsed = getPostRequestSchema.parse(req.params);
    } catch (e) {
      throw new ApiError('Invalid request', 400);
    }

    const post = await this.postService.get(parsed.id);

    if (!post) {
      throw new ApiError('Post not found', 404);
    }

    const response = { post } satisfies GetPostResponse;
    res.status(200).json(response);
  }

  async handleGetIdentity(req: express.Request, res: express.Response) {
    let parsed;

    try {
      parsed = getIdentityRequestSchema.parse(req.body);
    } catch (e) {
      throw new ApiError('Invalid request', 400);
    }

    const identityDescriptor = await this.identityService.getIdentityDescriptor(parsed.signal);
    const postCount = await this.postService.getPostCountForIdentity(identityDescriptor.identity);

    const response = {
      identity: identityDescriptor.identity,
      permissions: Array.from(identityDescriptor.permissions),
      postCount: postCount
    } satisfies GetIdentityResponse;
    res.status(200).json(response);
  }
}