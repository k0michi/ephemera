import type { StartedMariaDbContainer } from "@testcontainers/mariadb";
import Config from "../app/config.js";

export default class TestHelper {
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
}