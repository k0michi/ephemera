import { URL } from 'whatwg-url';

export type Host = {
  /**
   * The hostname, which can be a domain name, IPv4 address, or IPv6 address (enclosed in square brackets).
   */
  hostname: string;
  /**
   * The port number.
   */
  port: number;
};

export default class HostUtil {
  static isValid(host: string): boolean {
    try {
      const url = new URL(`https://${host}`);

      return url.pathname === '/' && url.search === '' && url.hash === '' && url.username === '' && url.password === '';
    } catch (e) {
      return false;
    }
  }

  static parse(host: string): Host {
    if (!this.isValid(host)) {
      throw new Error(`Invalid host: ${host}`);
    }

    const url = new URL(`https://${host}`);
    return {
      hostname: url.hostname,
      port: url.port === '' ? 443 : parseInt(url.port)
    };
  }

  static stringify({ hostname, port }: Host): string {
    let joined = port === 443 ? hostname : `${hostname}:${port}`;

    if (!this.isValid(joined)) {
      throw new Error(`Invalid host: ${joined}`);
    }

    return joined;
  }

  static getResolvableHostname({ hostname }: Host): string {
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      return hostname.slice(1, -1);
    }

    return hostname;
  }
}