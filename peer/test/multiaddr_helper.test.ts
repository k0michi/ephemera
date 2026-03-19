import { describe, expect, it } from "vitest";
import MultiaddrHelper from "../app/multiaddr_helper.js";
import { multiaddr } from "@multiformats/multiaddr";
import HostUtil from "@ephemera/shared/lib/host_util.js";

describe("MultiaddrHelper", () => {
  it("should extract host and port from a valid multiaddr", () => {
    {
      const addr = multiaddr("/ip4/127.0.0.1/tcp/8080");
      const host = MultiaddrHelper.getHostFromMultiaddr(addr);
      expect(host).toEqual(HostUtil.createHostFromResolvable("127.0.0.1", 8080));
    }

    {
      const addr = multiaddr("/ip6/::1/tcp/443");
      const host = MultiaddrHelper.getHostFromMultiaddr(addr);
      expect(host).toEqual(HostUtil.createHostFromResolvable("::1", 443));
    }
  });
});