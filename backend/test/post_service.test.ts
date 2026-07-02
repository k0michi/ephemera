import type { CreatePostSignalPayload } from '@ephemera/shared/api/api.js';
import Base37 from '@ephemera/shared/lib/base37.js';
import Crypto from '@ephemera/shared/lib/crypto.js';
import Hex from '@ephemera/shared/lib/hex.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import { StartedMariaDbContainer } from "@testcontainers/mariadb";
import type { StartedRedisContainer } from '@testcontainers/redis';
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { createPool, type Pool } from 'mysql2/promise';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AttachmentService } from '../app/attachment_service.js';
import type { PooledDatabase } from '../app/database.js';
import IdentityService from '../app/identity_service.js';
import { type IPeerService } from '../app/peer_service.js';
import PostService from '../app/post_service.js';
import { SignalService } from '../app/signal_service.js';
import TestHelper from './test_helper.js';

describe('PostService', () => {
  let container: StartedMariaDbContainer;
  let redisContainer: StartedRedisContainer;
  let database: PooledDatabase;
  let pool: Pool;
  let peerService: IPeerService;
  let attachmentService: AttachmentService;
  let postService: PostService;
  let signalService: SignalService;
  let identityService: IdentityService;

  beforeEach(async () => {
    container = await TestHelper.startDbContainer();
    redisContainer = await TestHelper.startRedisContainer();

    const db = drizzle(createPool(container.getConnectionUri()));
    pool = db.$client;
    database = db;
    await migrate(db, { migrationsFolder: './drizzle' });

    const config = TestHelper.getConfig(container, redisContainer);
    peerService = {
      async publish(signal) {
        return;
      },

      async handle(signal) {
        return;
      },

      getPeerDescriptor() {
        return {
          implementation: {
            name: "ephemera",
            version: "0.1.0",
          },
          host: 'example.com',
          publicKey: 'publicKey',
        };
      },

      async getRemoteServers() {
        return [];
      }
    };
    attachmentService = new AttachmentService(config, database);
    signalService = new SignalService(config);
    identityService = new IdentityService(config, signalService);
    postService = new PostService(config,
      database,
      attachmentService,
      peerService,
      identityService,
      signalService
    );
  }, 60_000);

  afterEach(async () => {
    await pool.end();
    await container.stop();
  });

  it('should insert a post signal successfully', async () => {
    const keyPair = Crypto.generateKeyPair();
    const publicKey = Base37.fromUint8Array(keyPair.publicKey);

    const signalPayload = [0, ['example.com', publicKey, Date.now(), 'create_post'], 'Hello, world!', []] satisfies CreatePostSignalPayload;
    const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);

    await expect(postService.create(signal, [])).resolves.toBeUndefined();
  });

  it('should reject a duplicate post signal', async () => {
    const keyPair = Crypto.generateKeyPair();
    const publicKey = Base37.fromUint8Array(keyPair.publicKey);

    const signalPayload = [0, ['example.com', publicKey, Date.now(), 'create_post'], 'Hello, world!', []] satisfies CreatePostSignalPayload;
    const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);

    await expect(postService.create(signal, [])).resolves.toBeUndefined();
    await expect(postService.create(signal, [])).rejects.toThrowError('Post already exists');
  });

  it('should reject a post with invalid host', async () => {
    const keyPair = Crypto.generateKeyPair();
    const publicKey = Base37.fromUint8Array(keyPair.publicKey);

    const signalPayload = [0, ['wrong.example.com', publicKey, Date.now(), 'create_post'], 'Hello, world!', []] satisfies CreatePostSignalPayload;
    const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);

    await expect(postService.create(signal, [])).rejects.toThrowError('Host mismatch');
  });

  it('should reject a post with timestamp out of range', async () => {
    const keyPair = Crypto.generateKeyPair();
    const publicKey = Base37.fromUint8Array(keyPair.publicKey);

    const signalPayload = [0, ['example.com', publicKey, Date.now() - 10 * 60 * 1000, 'create_post'], 'Hello, world!', []] satisfies CreatePostSignalPayload;
    const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);

    await expect(postService.create(signal, [])).rejects.toThrowError('Timestamp out of range');
  });

  it('should reject a post with invalid signature', async () => {
    const keyPair = Crypto.generateKeyPair();
    const publicKey = Base37.fromUint8Array(keyPair.publicKey);

    const signalPayload = [0, ['example.com', publicKey, Date.now(), 'create_post'], 'Hello, world!', []] satisfies CreatePostSignalPayload;
    const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);

    signal[1] = '0'.repeat(128);

    await expect(postService.create(signal, [])).rejects.toThrowError('Invalid signature');
  });

  describe('find', () => {
    it('should retrieve posts with pagination', async () => {
      const keyPair = Crypto.generateKeyPair();
      const publicKey = Base37.fromUint8Array(keyPair.publicKey);

      // Insert 5 posts
      for (let i = 0; i < 5; i++) {
        const signalPayload = [0, ['example.com', publicKey, Date.now(), 'create_post'], `Post number ${i}`, []] satisfies CreatePostSignalPayload;
        const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);
        await postService.create(signal, []);
      }

      let result = await postService.find({ limit: 3, cursor: null, author: null });
      expect(result.posts.length).toBe(3);
      expect(result.nextCursor).not.toBeNull();

      expect(result?.posts?.[0]?.[0][2]).toBe('Post number 4');
      expect(result?.posts?.[1]?.[0][2]).toBe('Post number 3');
      expect(result?.posts?.[2]?.[0][2]).toBe('Post number 2');

      result = await postService.find({ limit: 3, cursor: result.nextCursor, author: null });
      expect(result.posts.length).toBe(2);
      expect(result.nextCursor).toBeNull();

      expect(result?.posts?.[0]?.[0][2]).toBe('Post number 1');
      expect(result?.posts?.[1]?.[0][2]).toBe('Post number 0');
    });

    it('should retrieve posts with pagination, when limit matches total posts', async () => {
      const keyPair = Crypto.generateKeyPair();
      const publicKey = Base37.fromUint8Array(keyPair.publicKey);

      // Insert 1 post
      for (let i = 0; i < 1; i++) {
        const signalPayload = [0, ['example.com', publicKey, Date.now(), 'create_post'], `Post number ${i}`, []] satisfies CreatePostSignalPayload;
        const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);
        await postService.create(signal, []);
      }

      let result = await postService.find({ limit: 1, cursor: null, author: null });
      expect(result.posts.length).toBe(1);
      expect(result.nextCursor).toBeNull();

      expect(result?.posts?.[0]?.[0][2]).toBe('Post number 0');
    });

    it('should return empty result when no posts exist', async () => {
      const result = await postService.find({ limit: 3, cursor: null, author: null });
      expect(result.posts.length).toBe(0);
      expect(result.nextCursor).toBeNull();
    });

    it('should throw error for invalid limit', async () => {
      await expect(postService.find({ limit: 0, cursor: null, author: null })).rejects.toThrowError();
    });
  });

  describe('get', () => {
    it('should retrieve a post by ID', async () => {
      const keyPair = Crypto.generateKeyPair();
      const publicKey = Base37.fromUint8Array(keyPair.publicKey);

      const signalPayload = [0, ['example.com', publicKey, Date.now(), 'create_post'], 'Hello, world!', []] satisfies CreatePostSignalPayload;
      const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);
      await postService.create(signal, []);

      const digest = await SignalCrypto.digest(signalPayload);
      const digestHex = Hex.fromUint8Array(digest);

      const post = await postService.get(digestHex);
      expect(post).not.toBeNull();
      expect(post?.[0][2]).toBe('Hello, world!');
    });

    it('should return null for non-existent post', async () => {
      const post = await postService.get('nonexistentdigest');
      expect(post).toBeNull();
    });
  });
});