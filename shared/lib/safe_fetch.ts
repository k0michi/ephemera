import { lookup } from 'dns/promises';
import ipaddr from 'ipaddr.js';
import { Agent } from 'undici';

const safeDispatcher = new Agent({
  connect: {
    lookup: async (hostname, _options, callback) => {
      try {
        const result = await lookup(hostname);
        const addr = ipaddr.parse(result.address);

        if (addr.range() !== 'unicast') {
          throw new Error(`Unsafe IP address: ${result.address}`);
        }

        callback(null, result.address, result.family === 6 ? 6 : 4);
      } catch (err) {
        callback(err as Error, '', 4);
      }
    }
  }
});

export default class SafeFetch {
  static async safeFetch(targetUrl: string, options: RequestInit = {}): Promise<Response> {
    const urlObj = new URL(targetUrl);

    if (ipaddr.isValid(urlObj.hostname)) {
      const addr = ipaddr.parse(urlObj.hostname);
      if (addr.range() !== 'unicast') {
        throw new Error(`Unsafe IP address: ${urlObj.hostname}`);
      }
    }

    const fetchOptions = {
      ...options,
      dispatcher: safeDispatcher,
    };

    return await fetch(targetUrl, fetchOptions);
  }
}