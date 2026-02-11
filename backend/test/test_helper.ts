import { MariaDbContainer, type StartedMariaDbContainer } from "@testcontainers/mariadb";
import Config from "../app/config.js";
import type { Pool } from "mysql2";

export default class TestHelper {
  static startDbContainer() {
    return new MariaDbContainer('mariadb:11')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withUserPassword('test_pw')
      .start();
  }

  static getConfig(container: StartedMariaDbContainer) {
    const config = new Config({
      host: 'example.com',
      port: 3000,
      dbHost: container.getHost(),
      dbPort: container.getPort(),
      dbUser: container.getUsername(),
      dbPassword: container.getUserPassword(),
      dbName: container.getDatabase(),
      dbConnectionLimit: 5,
      dbQueueLimit: 500,
      dbConnectTimeout: 10000,
      allowedTimeSkewMillis: 5 * 60 * 1000,
    });
    return config;
  }

  static endPool(pool: Pool): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      pool.end(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}