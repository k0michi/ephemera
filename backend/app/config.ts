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

  constructor({ host, port }: { host: string; port: number }) {
    this.host = host;
    this.port = port;
  }

  static fromEnv(): Config {
    const host = NullableHelper.unwrap(process.env.EPHEMERA_HOST);
    const port = Number(NullableHelper.unwrap(process.env.EPHEMERA_PORT));
    return new Config({ host, port });
  }
}