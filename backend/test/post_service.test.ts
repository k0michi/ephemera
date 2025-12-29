import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MariaDbContainer, StartedMariaDbContainer } from "@testcontainers/mariadb";
import { DataSource } from 'typeorm';
import PostService from '../app/post_service.js';
import Crypto from '@ephemera/shared/lib/crypto.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import type { CreatePostSignalPayload } from '@ephemera/shared/api/api.js';
import Base37 from '@ephemera/shared/lib/base37.js';
import { Post } from '../app/entity/post.js';

describe('PostService', () => {
  let container: StartedMariaDbContainer;
  let dataSource: DataSource;
  let postService: PostService;

  beforeEach(async () => {
    container = await new MariaDbContainer('mariadb:11')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withUserPassword('test_pw')
      .start();

    dataSource = new DataSource({
      type: "mariadb",
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getUserPassword(),
      database: container.getDatabase(),
      synchronize: true,
      logging: false,
      entities: [Post],
      migrations: [],
      subscribers: [],
    });

    await dataSource.initialize();

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
      dataSource.getRepository('Post')
    );
  }, 60_000);

  afterEach(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (container) {
      await container.stop();
    }
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
});