import express from 'express';
import { postRequestSchema } from '@ephemera/shared/api/api_schema.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import { type IController } from '../lib/controller.js';
import { Application } from '../lib/application.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import ApiV1Controller from './api_v1_controller.js';
import Config from './config.js';

class Ephemera extends Application {
  config: Config;

  constructor() {
    super();

    this.config = Config.fromEnv();

    this.app.use(express.json());
    this.useController(new ApiV1Controller(this.config));
  }

  start() {
    this.listen(this.config.port, (error?: Error) => {
      if (error) {
        console.error('Failed to start server:', error);
      } else {
        console.log(`Server is running on port ${this.config.port}`);
      }
    });
  }
}

new Ephemera().start();