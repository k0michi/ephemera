import { URL } from 'whatwg-url';

export default class HostUtil {
  static isValid(host: string): boolean {
    try {
      const url = new URL(`https://${host}`);

      return url.pathname === '/' && url.search === '' && url.hash === '';
    } catch (e) {
      return false;
    }
  }
}