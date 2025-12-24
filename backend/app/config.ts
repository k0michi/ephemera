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
  allowedTimeSkewMillis: number;

  static _kDefaultAllowedTimeSkewMillis = 5 * 60 * 1000;

  constructor({ host, port, allowedTimeSkewMillis }: { host: string; port: number; allowedTimeSkewMillis: number }) {
    this.host = host;
    this.port = port;
    this.allowedTimeSkewMillis = allowedTimeSkewMillis;
  }

  static fromEnv(): Config {
    const host = NullableHelper.unwrap(process.env.EPHEMERA_HOST);
    const port = Number(NullableHelper.unwrap(process.env.EPHEMERA_PORT));
    const allowedTimeSkewMillis = NullableHelper.map(process.env.EPHEMERA_ALLOWED_TIME_SKEW_MILLIS, (val) => Number(val)) ?? Config._kDefaultAllowedTimeSkewMillis;
    return new Config({ host, port, allowedTimeSkewMillis });
  }
}