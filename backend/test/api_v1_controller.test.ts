import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import ApiV1Controller from '../app/api_v1_controller.js';
import type { CreatePostSignalPayload, PostRequest, CreatePostSignal, DeletePostSignal, Signal } from '@ephemera/shared/api/api.js';
import Config from '../app/config.js';
import Crypto from '@ephemera/shared/lib/crypto.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import Base37 from '@ephemera/shared/lib/base37.js';
import { PostServiceBase, type IPostService, type PostFindOptions, type PostFindResult } from '../app/post_service.js';
import type { IAttachmentService } from '../app/attachment_service.js';
import fs from 'fs/promises';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';

function testConfig() {
  return new Config({
    host: 'example.com',
    port: 3000,
    dbHost: 'localhost',
    dbPort: 3306,
    dbUser: 'test',
    dbPassword: 'test',
    dbName: 'test',
    dbConnectionLimit: 5,
    dbQueueLimit: 500,
    dbConnectTimeout: 10000,
    allowedTimeSkewMillis: 5 * 60 * 1000,
  });
}

class MockPostService extends PostServiceBase {
  constructor(config: Config) {
    super(config);
  }

  async createImpl(signal: CreatePostSignal): Promise<void> {
    return;
  }

  async find(options: PostFindOptions): Promise<PostFindResult> {
    return {
      posts: [],
      nextCursor: null,
    };
  }

  async delete(signal: DeletePostSignal): Promise<void> {
    return;
  }
}

class MockAttachmentService implements IAttachmentService {
  async fileDigest(filePath: string): Promise<string> {
    return 'hash';
  }

  async fileSize(filePath: string): Promise<number> {
    return 0;
  }

  async copyFrom(srcFile: string, declaredType: string): Promise<string> {
    return 'hash';
  }

  async open(hash: string): Promise<fs.FileHandle> {
    throw new Error('Method not implemented.');
  }

  async getType(hash: string): Promise<string> {
    return 'image/png';
  }

  async linkPost(postId: string, attachmentIds: string[]): Promise<void> {
    return;
  }

  getFilePath(hash: string): string {
    return `/attachments/${hash}`;
  }

  async removeOrphans(): Promise<void> {
    return;
  }
}

function createFormData(data: Record<string, string | Blob>): FormData {
  const formData = new FormData();
  for (const key in data) {
    formData.append(key, NullableHelper.unwrap(data[key]));
  }
  return formData;
}

describe('ApiV1Controller', () => {
  describe('handlePost', () => {
    it('should respond with 400 for invalid request body', async () => {
      const req = createRequest({
        method: 'POST',
        url: '/api/v1/post',
        body: createFormData({ post: JSON.stringify({ invalid: 'data' }) }),
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config), new MockAttachmentService());
      await expect(controller.handlePost(req, res)).rejects.toThrow('Invalid request');
    });

    it('should respond with 400 for invalid post signature', async () => {
      const req = createRequest({
        method: 'POST',
        url: '/api/v1/post',
        body: {
          post: JSON.stringify([[0, ['example.com', Base37.fromUint8Array(new Uint8Array(32).fill(1)), Date.now(), 'create_post'], 'body text', []], '0'.repeat(128)] satisfies CreatePostSignal),
        },
        files: [] as any,
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config), new MockAttachmentService());
      await expect(controller.handlePost(req, res)).rejects.toThrow('Invalid signature');
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
          post: JSON.stringify(signedSignal),
        },
        files: [] as any,
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config), new MockAttachmentService());
      await expect(controller.handlePost(req, res)).resolves.not.toThrow();
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
          post: JSON.stringify(signedSignal),
        },
        files: [] as any,
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config), new MockAttachmentService());
      await expect(controller.handlePost(req, res)).rejects.toThrow('Host mismatch');
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
          post: JSON.stringify(signedSignal),
        },
        files: [] as any,
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config), new MockAttachmentService());
      await expect(controller.handlePost(req, res)).rejects.toThrow('Timestamp out of range');
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

      const controller = new ApiV1Controller(config, new MockPostService(config), new MockAttachmentService());
      await expect(controller.handleGetPosts(req, res)).rejects.toThrow('Invalid request');
    });

    it('should respond with 200 and empty posts', async () => {
      const req = createRequest({
        method: 'GET',
        url: '/api/v1/posts',
        query: {
        },
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config, new MockPostService(config), new MockAttachmentService());
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