import express from 'express';
import { postRequestSchema } from '@ephemera/shared/dist/api/api_schema.js';
import SignalCrypto from '@ephemera/shared/dist/lib/signal_crypto.js';
import { type IController } from '../lib/controller.js';
import { Application } from '../lib/application.js';
import NullableHelper from '@ephemera/shared/dist/lib/nullable_helper.js';

interface IApiV1Controller extends IController {
  handlePost(req: express.Request, res: express.Response): Promise<void>;
}

class ApiV1Controller implements IApiV1Controller {
  public path = '/api/v1';
  public router = express.Router();

  constructor() {
    this.router.post('/post', this.handlePost.bind(this));
  }

  async handlePost(req: express.Request, res: express.Response) {
    const parsed = postRequestSchema.parse(req.body);

    if (!parsed) {
      res.status(400).json({ error: 'Invalid request' });
      return;
    }

    const verified = await SignalCrypto.verify(parsed.post);

    if (!verified) {
      res.status(400).json({ error: 'Invalid post signature' });
      return;
    }

    // TODO: Handle the post

    res.status(200).json({});
  }
}

class Ephemera extends Application {
  constructor() {
    super();

    this.app.use(express.json());
    this.useController(new ApiV1Controller());
  }
}

const ephemeraApp = new Ephemera();
const PORT = NullableHelper.map(process.env.PORT, Number) ?? 3000;

ephemeraApp.listen(PORT);