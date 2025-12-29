import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import ApiV1Controller from '../app/api_v1_controller.js';
import type { CreatePostSignalPayload, PostRequest, PostSignal } from '@ephemera/shared/api/api.js';
import Config from '../app/config.js';
import Crypto from '@ephemera/shared/lib/crypto.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import Base37 from '@ephemera/shared/lib/base37.js';
import { PostServiceBase, type IPostService, type PostFindOptions, type PostFindResult } from '../app/post_service.js';

function testConfig() {
  return new Config({
    host: 'example.com',
    port: 3000,
    dbHost: 'localhost',
    dbPort: 3306,
    dbUser: 'test',
    dbPassword: 'test',
    dbName: 'test',
    allowedTimeSkewMillis: 5 * 60 * 1000,
  });
}

class MockPostService extends PostServiceBase {
  constructor(config: Config) {
    super(config);
  }

  async createImpl(signal: PostSignal): Promise<void> {
    return;
  }

  async find(options: PostFindOptions): Promise<PostFindResult> {
    return {
      posts: [],
      nextCursor: null,
    };
  }
}

describe('ApiV1Controller', () => {
  describe('handlePost', () => {
    it('should respond with 400 for invalid request body', async () => {
      const req = createRequest({
        method: 'POST',
        url: '/api/v1/post',
        body: { invalid: 'data' },
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config));
      await controller.handlePost(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty('error', 'Invalid request');
    });

    it('should respond with 400 for invalid post signature', async () => {
      const req = createRequest({
        method: 'POST',
        url: '/api/v1/post',
        body: {
          post: [[0, ['host', 'invalid_public_key', 0, 'create_post'], 'body text', []], '0'.repeat(64)],
        } satisfies PostRequest,
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config));
      await controller.handlePost(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty('error', 'Invalid signature');
    });

    it('should respond with 200 for valid post', async () => {
      const keyPair = Crypto.generateKeyPair();
      const now = Date.now();
      const signedSignal = await SignalCrypto.sign(
        [0, ['example.com', Base37.fromUint8Array(keyPair.publicKey), now - 1000, 'create_post'], 'body text', []] satisfies CreatePostSignalPayload,
        keyPair.privateKey
      );

      const req = createRequest({
        method: 'POST',
        url: '/api/v1/post',
        body: {
          post: signedSignal,
        } satisfies PostRequest,
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config));
      await controller.handlePost(req, res);
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data).toEqual({});
    });

    it('should respond with 400 for host mismatch', async () => {
      const keyPair = Crypto.generateKeyPair();
      const now = Date.now();
      const signedSignal = await SignalCrypto.sign(
        [0, ['wronghost.com', Base37.fromUint8Array(keyPair.publicKey), now, 'create_post'], 'body text', []] satisfies CreatePostSignalPayload,
        keyPair.privateKey
      );

      const req = createRequest({
        method: 'POST',
        url: '/api/v1/post',
        body: {
          post: signedSignal,
        } satisfies PostRequest,
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config));
      await controller.handlePost(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty('error', 'Host mismatch');
    });

    it('should respond with 400 for timestamp out of range', async () => {
      const keyPair = Crypto.generateKeyPair();
      const now = Date.now();
      const signedSignal = await SignalCrypto.sign(
        [0, ['example.com', Base37.fromUint8Array(keyPair.publicKey), now - 10 * 60 * 1000, 'create_post'], 'body text', []] satisfies CreatePostSignalPayload,
        keyPair.privateKey
      );

      const req = createRequest({
        method: 'POST',
        url: '/api/v1/post',
        body: {
          post: signedSignal,
        } satisfies PostRequest,
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config));
      await controller.handlePost(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty('error', 'Timestamp out of range');
    });
  });

  describe('handleGetPosts', () => {
    it('should respond with 400 for invalid query parameters', async () => {
      const req = createRequest({
        method: 'GET',
        url: '/api/v1/posts',
        query: { limit: 'invalid' },
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config));
      await controller.handleGetPosts(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty('error', 'Invalid request');
    });

    it('should respond with 200 and empty posts', async () => {
      const req = createRequest({
        method: 'GET',
        url: '/api/v1/posts',
        query: {
          cursor: null,
        },
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config));
      await controller.handleGetPosts(req, res);
      expect(res.statusCode).toBe(200);
      const data = res._getJSONData();
      expect(data).toHaveProperty('posts');
      expect(Array.isArray(data.posts)).toBe(true);
      expect(data.posts.length).toBe(0);
      expect(data).toHaveProperty('nextCursor', null);
    });
  });
});