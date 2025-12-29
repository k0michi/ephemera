import express from 'express';
import { postRequestSchema } from '@ephemera/shared/api/api_schema.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import { type IController } from '../lib/controller.js';
import type Config from './config.js';
import type { IPostService } from './post_service.js';
import { ApiError } from './api_error.js';
import type { GetPostsResponse } from '@ephemera/shared/api/api.js';

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
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    try {
      await this.postService.create(parsed.post);
    } catch (e) {
      if (e instanceof ApiError) {
        res.status(e.statusCode).json({ error: e.message });
        return;
      } else {
        console.error('Unexpected error in handlePost:', e);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
    }

    res.status(200).json({});
  }

  async handleGetPosts(req: express.Request, res: express.Response) {
    try {
      const posts = await this.postService.find();
      res.status(200).json({ posts } satisfies GetPostsResponse);
    } catch (e) {
      console.error('Unexpected error in handleGetPosts:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}