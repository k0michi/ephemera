import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MariaDbContainer, StartedMariaDbContainer } from "@testcontainers/mariadb";
import PostService from '../app/post_service.js';
import Crypto from '@ephemera/shared/lib/crypto.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import type { CreatePostSignalPayload } from '@ephemera/shared/api/api.js';
import Base37 from '@ephemera/shared/lib/base37.js';
import type { MySql2Database } from 'drizzle-orm/mysql2';
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from 'drizzle-orm/mysql2/migrator';
import type { Pool } from 'mysql2';

describe('PostService', () => {
  let container: StartedMariaDbContainer;
  let database: MySql2Database;
  let pool: Pool;
  let postService: PostService;

  beforeEach(async () => {
    container = await new MariaDbContainer('mariadb:11')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withUserPassword('test_pw')
      .start();

    const db = drizzle(container.getConnectionUri());
    pool = db.$client;
    database = db;
    await migrate(db, { migrationsFolder: './drizzle' });

    postService = new PostService(
      {
        host: 'example.com',
        port: 3000,
        dbHost: container.getHost(),
        dbPort: container.getPort(),
        dbUser: container.getUsername(),
        dbPassword: container.getUserPassword(),
        dbName: container.getDatabase(),
        allowedTimeSkewMillis: 5 * 60 * 1000,
      },
      database
    );
  }, 60_000);

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      pool.end(err => {
        if (err) reject(err);
        else resolve();
      });
    });
    await container.stop();
  });

  it('should insert a post signal successfully', async () => {
    const keyPair = Crypto.generateKeyPair();
    const publicKey = Base37.fromUint8Array(keyPair.publicKey);

    const signalPayload = [0, ['example.com', publicKey, Date.now(), 'create_post'], 'Hello, world!', []] satisfies CreatePostSignalPayload;
    const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);

    await expect(postService.create(signal)).resolves.toBeUndefined();
  });

  it('should reject a duplicate post signal', async () => {
    const keyPair = Crypto.generateKeyPair();
    const publicKey = Base37.fromUint8Array(keyPair.publicKey);

    const signalPayload = [0, ['example.com', publicKey, Date.now(), 'create_post'], 'Hello, world!', []] satisfies CreatePostSignalPayload;
    const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);

    await expect(postService.create(signal)).resolves.toBeUndefined();
    await expect(postService.create(signal)).rejects.toThrowError('Post already exists');
  });

  describe('find', () => {
    it('should retrieve posts with pagination', async () => {
      const keyPair = Crypto.generateKeyPair();
      const publicKey = Base37.fromUint8Array(keyPair.publicKey);

      // Insert 5 posts
      for (let i = 0; i < 5; i++) {
        const signalPayload = [0, ['example.com', publicKey, Date.now(), 'create_post'], `Post number ${i}`, []] satisfies CreatePostSignalPayload;
        const signal = await SignalCrypto.sign(signalPayload, keyPair.privateKey);
        await postService.create(signal);
      }

      let result = await postService.find({ limit: 3, cursor: null });
      expect(result.posts.length).toBe(3);
      expect(result.nextCursor).not.toBeNull();

      expect(result?.posts?.[0]?.[0][2]).toBe('Post number 4');
      expect(result?.posts?.[1]?.[0][2]).toBe('Post number 3');
      expect(result?.posts?.[2]?.[0][2]).toBe('Post number 2');

      result = await postService.find({ limit: 3, cursor: result.nextCursor });
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
        await postService.create(signal);
      }

      let result = await postService.find({ limit: 1, cursor: null });
      expect(result.posts.length).toBe(1);
      expect(result.nextCursor).toBeNull();

      expect(result?.posts?.[0]?.[0][2]).toBe('Post number 0');
    });

    it('should return empty result when no posts exist', async () => {
      const result = await postService.find({ limit: 3, cursor: null });
      expect(result.posts.length).toBe(0);
      expect(result.nextCursor).toBeNull();
    });

    it('should throw error for invalid limit', async () => {
      await expect(postService.find({ limit: 0, cursor: null })).rejects.toThrowError();
    });
  });
});