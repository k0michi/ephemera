import { describe, it, expect, vi } from "vitest";
import { Client } from "../app/client";
import type { PostResponse } from "../../shared/api/api";
import Crypto from "~/crypto";

describe("Client.sendPost", () => {
  it("should send a POST request to /api/v1/post", async () => {
    const keyPair = Crypto.generateKeyPair();
    const client = new Client("example.com", keyPair);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({} satisfies PostResponse)
    });

    await expect(client.sendPost("hello")).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/v1/post",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
        body: expect.stringContaining("post")
      })
    );
  });
});
