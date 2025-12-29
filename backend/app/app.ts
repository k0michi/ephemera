import "reflect-metadata";
import express from 'express';
import { Application } from '../lib/application.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import ApiV1Controller from './api_v1_controller.js';
import Config from './config.js';
import { DataSource } from "typeorm";
import { Post } from "./entity/post.js";
import PostService from "./post_service.js";

class Ephemera extends Application {
  config?: Config;
  postService?: PostService;
  dataSource?: DataSource;

  constructor() {
    super();
  }

  async initializeDatabase() {
    const config = NullableHelper.unwrap(this.config);

    let attempts = 0;
    let delay = 1000;
    const kMaxAttempts = 10;

    while (true) {
      try {
        this.dataSource = new DataSource({
          type: "mariadb",
          host: config.dbHost,
          port: config.dbPort,
          username: config.dbUser,
          password: config.dbPassword,
          database: config.dbName,
          synchronize: true,
          logging: false,
          entities: [Post],
          migrations: [],
          subscribers: [],
        });

        await this.dataSource.initialize();
      } catch (error) {
        attempts++;
        console.error(`Database configuration attempt ${attempts} failed:`, error);

        if (attempts >= kMaxAttempts) {
          throw new Error('Max database connection attempts exceeded');
        }

        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delay));
        delay = Math.min(delay * 2, 30000);
        continue;
      }

      break;
    }
  }

  async initialize() {
    this.config = Config.fromEnv();
    await this.initializeDatabase();
    console.log('Database initialized');

    this.postService = new PostService(this.config, NullableHelper.unwrap(this.dataSource).getRepository(Post));

    this.app.use(express.json());
    this.useController(new ApiV1Controller(this.config, this.postService));

    console.log('Application initialized');
  }

  start() {
    const port = NullableHelper.unwrap(this.config?.port);

    this.listen(port, (error?: Error) => {
      if (error) {
        console.error('Failed to start server:', error);
      } else {
        console.log(`Server is running on port ${port}`);
      }
    });
  }
}

const application = new Ephemera();
await application.initialize();
application.start();