import { URL } from 'whatwg-url';

export default class HostUtil {
  static isValid(host: string): boolean {
    try {
      const url = new URL(`https://${host}`);

      return url.pathname === '/' && url.search === '' && url.hash === '' && url.username === '' && url.password === '';
    } catch (e) {
      return false;
    }
  }

  static parse(host: string): { hostname: string; port: number } {
    if (!this.isValid(host)) {
      throw new Error(`Invalid host: ${host}`);
    }

    const url = new URL(`https://${host}`);
    return {
      hostname: url.hostname,
      port: url.port === '' ? 443 : parseInt(url.port)
    };
  }

  static stringify({ hostname, port }: { hostname: string; port: number }): string {
    let joined = port === 443 ? hostname : `${hostname}:${port}`;

    if (!this.isValid(joined)) {
      throw new Error(`Invalid host: ${joined}`);
    }

    return joined;
  }
}