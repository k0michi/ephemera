import express from 'express';
import { postRequestSchema } from '@ephemera/shared/api/api_schema.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import { type IController } from '../lib/controller.js';
import { Application } from '../lib/application.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import ApiV1Controller from './api_v1_controller.js';

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