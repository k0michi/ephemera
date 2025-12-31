
import express from 'express';
import { Application } from '../lib/application.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import ApiV1Controller from './api_v1_controller.js';
import Config from './config.js';
import PostService from "./post_service.js";
import { ApiError } from "./api_error.js";
import type { ApiResponse } from "@ephemera/shared/api/api.js";
import { drizzle, MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { migrate } from 'drizzle-orm/mysql2/migrator';

class Ephemera extends Application {
  config?: Config;
  postService?: PostService;
  db?: MySql2Database;

  constructor() {
    super();
  }

  async initializeDatabase() {
    const config = NullableHelper.unwrap(this.config);
    let attempts = 0;
    let delay = 1000;
    const kMaxAttempts = 10;
    let connection;
    while (true) {
      try {
        connection = await mysql.createConnection({
          host: config.dbHost,
          port: config.dbPort,
          user: config.dbUser,
          password: config.dbPassword,
          database: config.dbName,
        });
        break;
      } catch (error) {
        attempts++;
        console.error(`Database configuration attempt ${attempts} failed:`, error);
        if (attempts >= kMaxAttempts) {
          throw new Error('Max database connection attempts exceeded');
        }
        console.log(`Retrying in ${delay / 1000} seconds...`);
        await new Promise(res => setTimeout(res, delay));
        delay = Math.min(delay * 2, 30000);
      }
    }
    this.db = drizzle(connection);
    await migrate(this.db, { migrationsFolder: './drizzle' });
  }

  async initialize() {
    this.config = Config.fromEnv();
    await this.initializeDatabase();
    console.log('Database initialized');

    this.postService = new PostService(this.config, this.db!);

    this.app.use(express.json());
    this.useController(new ApiV1Controller(this.config, this.postService));

    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (err instanceof ApiError) {
        res.status(err.statusCode).json({ error: err.message } satisfies ApiResponse);
      } else {
        console.error('Unhandled error:', err);
        res.status(500).json({ error: 'Internal Server Error' } satisfies ApiResponse);
      }
    });

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