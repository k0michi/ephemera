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

  private static unwrapStringMandatory(env: NodeJS.ProcessEnv, key: string): string {
    const value = env[key];

    if (value === undefined) {
      throw new Error(`Environment variable ${key} is not set`);
    }

    return value;
  }

  private static unwrapNumberMandatory(env: NodeJS.ProcessEnv, key: string): number {
    const value = env[key];

    if (value === undefined) {
      throw new Error(`Environment variable ${key} is not set`);
    }

    const num = Number(value);

    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} is not a valid number`);
    }

    return num;
  }

  private static unwrapStringOptional(env: NodeJS.ProcessEnv, key: string, defaultValue: string): string {
    const value = env[key];

    if (value === undefined) {
      return defaultValue;
    }

    return value;
  }

  private static unwrapNumberOptional(env: NodeJS.ProcessEnv, key: string, defaultValue: number): number {
    const value = env[key];

    if (value === undefined) {
      return defaultValue;
    }

    const num = Number(value);

    if (isNaN(num)) {
      return defaultValue;
    }

    return num;
  }

  static fromEnv(): Config {
    const host = Config.unwrapStringMandatory(process.env, 'EPHEMERA_HOST');
    const port = Config.unwrapNumberMandatory(process.env, 'EPHEMERA_PORT');
    const dbHost = Config.unwrapStringMandatory(process.env, 'EPHEMERA_DB_HOST');
    const dbPort = Config.unwrapNumberMandatory(process.env, 'EPHEMERA_DB_PORT');
    const dbUser = Config.unwrapStringMandatory(process.env, 'EPHEMERA_DB_USER');
    const dbPassword = Config.unwrapStringMandatory(process.env, 'EPHEMERA_DB_PASSWORD');
    const dbName = Config.unwrapStringMandatory(process.env, 'EPHEMERA_DB_NAME');
    const allowedTimeSkewMillis = Config.unwrapNumberOptional(process.env, 'EPHEMERA_ALLOWED_TIME_SKEW_MILLIS', Config._kDefaultAllowedTimeSkewMillis);
    return new Config({ host, port, dbHost, dbPort, dbUser, dbPassword, dbName, allowedTimeSkewMillis });
  }
}