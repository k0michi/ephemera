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
  allowedTimeSkewMillis: number;

  static _kDefaultAllowedTimeSkewMillis = 5 * 60 * 1000;

  constructor({ host, port, dbHost, dbPort, dbUser, dbPassword, dbName, allowedTimeSkewMillis }: { host: string; port: number; dbHost: string; dbPort: number; dbUser: string; dbPassword: string; dbName: string; allowedTimeSkewMillis: number }) {
    this.host = host;
    this.port = port;
    this.dbHost = dbHost;
    this.dbPort = dbPort;
    this.dbUser = dbUser;
    this.dbPassword = dbPassword;
    this.dbName = dbName;
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
    const allowedTimeSkewMillis = envParser.getNumberOptional('EPHEMERA_ALLOWED_TIME_SKEW_MILLIS', Config._kDefaultAllowedTimeSkewMillis);
    return new Config({ host, port, dbHost, dbPort, dbUser, dbPassword, dbName, allowedTimeSkewMillis });
  }
}