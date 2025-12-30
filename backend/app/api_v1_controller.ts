import express from 'express';
import { getPostsRequestSchema, postRequestSchema } from '@ephemera/shared/api/api_schema.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import { type IController } from '../lib/controller.js';
import type Config from './config.js';
import type { IPostService, PostFindOptions } from './post_service.js';
import { ApiError } from './api_error.js';
import type { GetPostsResponse } from '@ephemera/shared/api/api.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';

export default class ApiV1Controller implements IController {
  public path = '/api/v1';
  public router = express.Router();
  private config: Config;
  private postService: IPostService;

  constructor(config: Config, postService: IPostService) {
    this.config = config;
    this.postService = postService;
    this.router.post('/post', this.handlePost.bind(this));
    this.router.get('/posts', this.handleGetPosts.bind(this));
  }

  async handlePost(req: express.Request, res: express.Response) {
    let parsed;

    try {
      parsed = postRequestSchema.parse(req.body);
    } catch (e) {
      throw new ApiError('Invalid request', 400);
    }

    await this.postService.create(parsed.post);
    res.status(200).json({});
  }

  static parseInt(string: string): number {
    const result = Number.parseInt(string, 10);

    if (Number.isNaN(result)) {
      throw new Error('Invalid request');
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
    };

    const result = await this.postService.find(options);

    const response: GetPostsResponse = {
      posts: result.posts,
      nextCursor: result.nextCursor,
    };

    res.status(200).json(response);
  }
}