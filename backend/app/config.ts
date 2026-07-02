import EnvParser from "@ephemera/shared/lib/env_parser.js";

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
  redisHost: string;
  redisPort: number;
  peerHost: string;
  privateKey: string;
  publicKey: string;
  dataDir: string;
  allowedTimeSkewMillis: number;
  allowedIdentities: string[];
  deniedIdentities: string[];

  static _kDefaultDBConnectionLimit = 5;
  static _kDefaultDBQueueLimit = 500;
  static _kDefaultDBConnectTimeout = 10000;
  static _kDefaultDataDir = './data';
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
    redisHost,
    redisPort,
    peerHost,
    privateKey,
    publicKey,
    dataDir,
    allowedTimeSkewMillis,
    allowedIdentities,
    deniedIdentities
  }: {
    host: string;
    port: number;
    dbHost: string;
    dbPort: number;
    dbUser: string;
    dbPassword: string;
    dbName: string;
    dbConnectionLimit?: number | undefined;
    dbQueueLimit?: number | undefined;
    dbConnectTimeout?: number | undefined;
    redisHost: string;
    redisPort: number;
    peerHost: string;
    privateKey: string;
    publicKey: string;
    dataDir?: string | undefined;
    allowedTimeSkewMillis: number;
    allowedIdentities?: string[] | undefined;
    deniedIdentities?: string[] | undefined;
  }) {
    this.host = host;
    this.port = port;
    this.dbHost = dbHost;
    this.dbPort = dbPort;
    this.dbUser = dbUser;
    this.dbPassword = dbPassword;
    this.dbName = dbName;
    this.dbConnectionLimit = dbConnectionLimit ?? Config._kDefaultDBConnectionLimit;
    this.dbQueueLimit = dbQueueLimit ?? Config._kDefaultDBQueueLimit;
    this.dbConnectTimeout = dbConnectTimeout ?? Config._kDefaultDBConnectTimeout;
    this.redisHost = redisHost;
    this.redisPort = redisPort;
    this.peerHost = peerHost;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.dataDir = dataDir ?? Config._kDefaultDataDir;
    this.allowedTimeSkewMillis = allowedTimeSkewMillis;
    this.allowedIdentities = allowedIdentities ?? [];
    this.deniedIdentities = deniedIdentities ?? [];
  }

  static fromEnv(): Config {
    const envParser = new EnvParser(process.env);
    return new Config({
      host: envParser.getStringRequired('EPHEMERA_HOST'),
      port: envParser.getNumberRequired('EPHEMERA_PORT'),
      dbHost: envParser.getStringRequired('EPHEMERA_DB_HOST'),
      dbPort: envParser.getNumberRequired('EPHEMERA_DB_PORT'),
      dbUser: envParser.getStringRequired('EPHEMERA_DB_USER'),
      dbPassword: envParser.getStringRequired('EPHEMERA_DB_PASSWORD'),
      dbName: envParser.getStringRequired('EPHEMERA_DB_NAME'),
      dbConnectionLimit: envParser.getNumberOptional('EPHEMERA_DB_CONNECTION_LIMIT', Config._kDefaultDBConnectionLimit),
      dbQueueLimit: envParser.getNumberOptional('EPHEMERA_DB_QUEUE_LIMIT', Config._kDefaultDBQueueLimit),
      dbConnectTimeout: envParser.getNumberOptional('EPHEMERA_DB_CONNECT_TIMEOUT', Config._kDefaultDBConnectTimeout),
      redisHost: envParser.getStringRequired('EPHEMERA_REDIS_HOST'),
      redisPort: envParser.getNumberRequired('EPHEMERA_REDIS_PORT'),
      peerHost: envParser.getStringRequired('EPHEMERA_PEER_HOST'),
      privateKey: envParser.getStringRequired('EPHEMERA_PRIVATE_KEY'),
      publicKey: envParser.getStringRequired('EPHEMERA_PUBLIC_KEY'),
      dataDir: envParser.getStringOptional('EPHEMERA_DATA_DIR', Config._kDefaultDataDir),
      allowedTimeSkewMillis: envParser.getNumberOptional('EPHEMERA_ALLOWED_TIME_SKEW_MILLIS', Config._kDefaultAllowedTimeSkewMillis),
      allowedIdentities: envParser.getStringArrayOptional('EPHEMERA_ALLOWED_IDENTITIES'),
      deniedIdentities: envParser.getStringArrayOptional('EPHEMERA_DENIED_IDENTITIES'),
    });
  }
}