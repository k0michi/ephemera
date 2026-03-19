import { Multiaddr } from '@multiformats/multiaddr';
import HostUtil, { Host } from '@ephemera/shared/lib/host_util.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';

export default class MultiaddrHelper {
  /**
   * Extracts the hostname and port from a multiaddr, if possible. Returns null if extraction fails.
   */
  static getHostFromMultiaddr(addr: Multiaddr): Host | null {
    let hostname: string | null = null;
    let port: number | null = null;

    for (const c of addr.getComponents()) {
      if (hostname === null && (
        c.name === 'dns'
        || c.name === 'dns4'
        || c.name === 'dns6'
        || c.name === 'ip4'
        || c.name === 'ip6'
      )) {
        hostname = c.value ?? null;
      }

      if (port === null && (c.name === 'tcp' || c.name === 'udp')) {
        port = NullableHelper.map(c.value, (v) => parseInt(v, 10)) ?? null;
      }
    }

    if (hostname !== null && port !== null) {
      return HostUtil.createHostFromResolvable(hostname, port);
    } else {
      return null;
    }
  }
}