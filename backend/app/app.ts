
import express from 'express';
import { Application } from '../lib/application.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import ApiV1Controller from './api_v1_controller.js';
import Config from './config.js';
import PostService from "./post_service.js";
import { ApiError } from "./api_error.js";
import type { ApiResponse, Attachment } from "@ephemera/shared/api/api.js";
import { drizzle, MySql2Database, type MySql2PreparedQueryHKT, type MySql2QueryResultHKT } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { AttachmentService } from './attachment_service.js';
import { PeerService } from './peer_service.js';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { MySqlTransaction } from 'drizzle-orm/mysql-core';

export type PooledDatabase = MySql2Database<Record<string, never>> & {
  $client: mysql.Pool;
};

export type Transaction = MySqlTransaction<MySql2QueryResultHKT, MySql2PreparedQueryHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>;

class Ephemera extends Application {
  config?: Config;
  postService?: PostService;
  attachmentService?: AttachmentService;
  peerService?: PeerService;
  db?: PooledDatabase;

  constructor() {
    super();
  }

  async migrateDatabase() {
    async function tryConnect(options: mysql.ConnectionOptions, maxAttempts: number, initialDelay: number): Promise<mysql.Connection> {
      let attempts = 0;
      let delay = initialDelay;

      while (true) {
        try {
          return await mysql.createConnection(options);
        } catch (error) {
          attempts++;
          console.error(`Database configuration attempt ${attempts} failed:`, error);

          if (attempts >= maxAttempts) {
            throw new Error('Max database connection attempts exceeded');
          }

          console.log(`Retrying in ${delay / 1000} seconds...`);
          await new Promise(res => setTimeout(res, delay));
          delay = Math.min(delay * 2, 30000);
        }
      }
    }

    const config = NullableHelper.unwrap(this.config);

    const kMaxAttempts = 10;
    const kInitialDelay = 1000;

    const connection = await tryConnect({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
    }, kMaxAttempts, kInitialDelay);

    const db = drizzle(connection);
    await migrate(db, { migrationsFolder: './drizzle' });

    await connection.end();
  }

  async connectDatabase() {
    const config = NullableHelper.unwrap(this.config);

    this.db = drizzle(mysql.createPool({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,

      waitForConnections: true,
      enableKeepAlive: true,
      connectionLimit: config.dbConnectionLimit,
      queueLimit: config.dbQueueLimit,
      connectTimeout: config.dbConnectTimeout,

      timezone: 'Z',
    }));
  }

  async initialize() {
    this.config = Config.fromEnv();

    await this.migrateDatabase();
    console.log('Database successfully migrated');

    await this.connectDatabase();
    console.log('Database connection established');

    this.peerService = new PeerService(this.config, NullableHelper.unwrap(this.db));
    this.attachmentService = new AttachmentService(this.config, NullableHelper.unwrap(this.db));
    this.postService = new PostService(this.config, NullableHelper.unwrap(this.db), this.attachmentService, this.peerService);
    this.app.use(express.json());
    this.useController(new ApiV1Controller(this.config, this.postService, this.attachmentService, this.peerService));

    this.app.use((req: express.Request, res: express.Response) => {
      res.status(404).json({ error: 'Not Found' } satisfies ApiResponse);
    });

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