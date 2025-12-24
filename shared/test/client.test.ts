import { describe, it, expect, vi } from "vitest";
import Client from "../lib/client.js";
import type { PostResponse } from "../api/api.js";
import Crypto from "../lib/crypto.js";

describe("Client.sendPost", () => {
  it("should send a POST request to /api/v1/post", async () => {
    const keyPair = Crypto.generateKeyPair();
    const client = new Client("example.com", keyPair);
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({} satisfies PostResponse)
    });

    await expect(client.sendPost("hello")).resolves.toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/v1/post",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: expect.stringContaining("post")
      })
    );
  });
});
