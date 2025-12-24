import express from 'express';
import { postRequestSchema } from '@ephemera/shared/api/api_schema.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import { type IController } from '../lib/controller.js';
import type Config from './config.js';

export default class ApiV1Controller implements IController {
  public path = '/api/v1';
  public router = express.Router();
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.router.post('/post', this.handlePost.bind(this));
  }

  async handlePost(req: express.Request, res: express.Response) {
    let parsed;

    try {
      parsed = postRequestSchema.parse(req.body);
    } catch (e) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    const verified = await SignalCrypto.verify(parsed.post);

    if (!verified) {
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    if (parsed.post[0][1][0] !== this.config.host) {
      res.status(400).json({ error: 'Host mismatch' });
      return;
    }

    const now = Date.now();
    const timestamp = parsed.post[0][1][2];

    if (Math.abs(now - timestamp) > this.config.allowedTimeSkewMillis) {
      res.status(400).json({ error: 'Timestamp out of range' });
      return;
    }

    res.status(200).json({});
  }
}