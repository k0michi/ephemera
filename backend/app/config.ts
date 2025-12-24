import NullableHelper from "@ephemera/shared/lib/nullable_helper.js";

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
    const host = NullableHelper.unwrap(process.env.EPHEMERA_HOST);
    const port = Number(NullableHelper.unwrap(process.env.EPHEMERA_PORT));
    const dbHost = NullableHelper.unwrap(process.env.EPHEMERA_DB_HOST);
    const dbPort = Number(NullableHelper.unwrap(process.env.EPHEMERA_DB_PORT));
    const dbUser = NullableHelper.unwrap(process.env.EPHEMERA_DB_USER);
    const dbPassword = NullableHelper.unwrap(process.env.EPHEMERA_DB_PASSWORD);
    const dbName = NullableHelper.unwrap(process.env.EPHEMERA_DB_NAME);
    const allowedTimeSkewMillis = NullableHelper.map(process.env.EPHEMERA_ALLOWED_TIME_SKEW_MILLIS, (val) => Number(val)) ?? Config._kDefaultAllowedTimeSkewMillis;
    return new Config({ host, port, dbHost, dbPort, dbUser, dbPassword, dbName, allowedTimeSkewMillis });
  }
}