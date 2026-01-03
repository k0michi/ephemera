import EnvParser from "./env_parser.js";

export default class Config {
  /**
   * Public host name. The port may be different from the listening port.
   */
  host: string;
  /**
   * Listening port number.
   */
  port: number;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbConnectionLimit: number;
  dbQueueLimit: number;
  dbConnectTimeout: number;
  dataDir: string;
  allowedTimeSkewMillis: number;

  static _kDefaultDBConnectionLimit = 5;
  static _kDefaultDBQueueLimit = 500;
  static _kDefaultDBConnectTimeout = 10000;
  static _kDefaultAllowedTimeSkewMillis = 5 * 60 * 1000;

  constructor({
    host,
    port,
    dbHost,
    dbPort,
    dbUser,
    dbPassword,
    dbName,
    dbConnectionLimit,
    dbQueueLimit,
    dbConnectTimeout,
    dataDir,
    allowedTimeSkewMillis,
  }: {
    host: string;
    port: number;
    dbHost: string;
    dbPort: number;
    dbUser: string;
    dbPassword: string;
    dbName: string;
    dbConnectionLimit: number;
    dbQueueLimit: number;
    dbConnectTimeout: number;
    dataDir: string;
    allowedTimeSkewMillis: number;
  }) {
    this.host = host;
    this.port = port;
    this.dbHost = dbHost;
    this.dbPort = dbPort;
    this.dbUser = dbUser;
    this.dbPassword = dbPassword;
    this.dbName = dbName;
    this.dbConnectionLimit = dbConnectionLimit;
    this.dbQueueLimit = dbQueueLimit;
    this.dbConnectTimeout = dbConnectTimeout;
    this.dataDir = dataDir;
    this.allowedTimeSkewMillis = allowedTimeSkewMillis;
  }

  static fromEnv(): Config {
    const envParser = new EnvParser(process.env);
    const host = envParser.getStringRequired('EPHEMERA_HOST');
    const port = envParser.getNumberRequired('EPHEMERA_PORT');
    const dbHost = envParser.getStringRequired('EPHEMERA_DB_HOST');
    const dbPort = envParser.getNumberRequired('EPHEMERA_DB_PORT');
    const dbUser = envParser.getStringRequired('EPHEMERA_DB_USER');
    const dbPassword = envParser.getStringRequired('EPHEMERA_DB_PASSWORD');
    const dbName = envParser.getStringRequired('EPHEMERA_DB_NAME');
    const dbConnectionLimit = envParser.getNumberOptional('EPHEMERA_DB_CONNECTION_LIMIT', Config._kDefaultDBConnectionLimit);
    const dbQueueLimit = envParser.getNumberOptional('EPHEMERA_DB_QUEUE_LIMIT', Config._kDefaultDBQueueLimit);
    const dbConnectTimeout = envParser.getNumberOptional('EPHEMERA_DB_CONNECT_TIMEOUT', Config._kDefaultDBConnectTimeout);
    const dataDir = envParser.getStringOptional('EPHEMERA_DATA_DIR', './data');
    const allowedTimeSkewMillis = envParser.getNumberOptional('EPHEMERA_ALLOWED_TIME_SKEW_MILLIS', Config._kDefaultAllowedTimeSkewMillis);
    return new Config({
      host,
      port,
      dbHost,
      dbPort,
      dbUser,
      dbPassword,
      dbName,
      dbConnectionLimit,
      dbQueueLimit,
      dbConnectTimeout,
      dataDir,
      allowedTimeSkewMillis,
    });
  }
}