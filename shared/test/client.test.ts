import { describe, it, expect, vi } from "vitest";
import Client from "../lib/client.js";
import type { GetPostsResponse, PostResponse } from "../api/api.js";
import Crypto from "../lib/crypto.js";

describe("Client", () => {
  describe("sendPost", () => {
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

  describe("fetchPosts", () => {
    it("should send a GET request to /api/v1/posts", async () => {
      const keyPair = Crypto.generateKeyPair();
      const client = new Client("example.com", keyPair);
      const mockResponse: GetPostsResponse = {
        posts: [],
        nextCursor: null,
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(client.fetchPosts({
        cursor: null,
      })).resolves.toEqual(mockResponse);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/v1/posts?",
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should send a GET request with cursor parameter", async () => {
      const keyPair = Crypto.generateKeyPair();
      const client = new Client("example.com", keyPair);
      const mockResponse: GetPostsResponse = {
        posts: [],
        nextCursor: null,
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(client.fetchPosts({
        cursor: "cursor123",
      })).resolves.toEqual(mockResponse);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/v1/posts?cursor=cursor123",
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should send a GET request with limit parameter", async () => {
      const keyPair = Crypto.generateKeyPair();
      const client = new Client("example.com", keyPair);
      const mockResponse: GetPostsResponse = {
        posts: [],
        nextCursor: null,
      };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(client.fetchPosts({
        cursor: null,
        limit: 10,
      })).resolves.toEqual(mockResponse);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/v1/posts?limit=10",
        expect.objectContaining({
          method: "GET",
        })
      );
    });
  });
});