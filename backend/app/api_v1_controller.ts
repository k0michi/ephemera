import express from 'express';
import { postRequestSchema } from '@ephemera/shared/api/api_schema.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import { type IController } from '../lib/controller.js';

export default class ApiV1Controller implements IController {
  public path = '/api/v1';
  public router = express.Router();

  constructor() {
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

    // TODO: Handle the post

    res.status(200).json({});
  }
}