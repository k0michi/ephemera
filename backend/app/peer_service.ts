import grpc from '@grpc/grpc-js';
import { PubSubServiceClient } from '@ephemera/shared/peer/bridge.js';
import type { MySql2Database } from "drizzle-orm/mysql2";
import type Config from './config.js';
import type { ServerSignal } from '@ephemera/shared/api/api.js';

export interface IPeerService {
  publish(signal: ServerSignal): Promise<void>;
}

export class PeerService {
  private config: Config;
  private database: MySql2Database;
  private grpcClient: PubSubServiceClient;

  constructor(config: Config, database: MySql2Database) {
    this.config = config;
    this.database = database;
    this.grpcClient = new PubSubServiceClient(
      this.config.peerHost,
      grpc.credentials.createInsecure()
    );
  }

  async publish(signal: ServerSignal): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.grpcClient.publish({ data: JSON.stringify(signal) }, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}