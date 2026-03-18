import grpc from '@grpc/grpc-js';
import { Message, PubSubServiceClient } from '@ephemera/shared/peer/bridge.js';
import type { MySql2Database } from "drizzle-orm/mysql2";
import type Config from './config.js';
import type { PeerManifest, RelaySignal, ServerSignal } from '@ephemera/shared/api/api.js';
import { createPostSignalSchema, deletePostSignalSchema, getPeerResponseSchema, relaySignalSchema, serverSignalSchema } from '@ephemera/shared/api/api_schema.js';
import { remotePosts } from './db/schema.js';
import Hex from '@ephemera/shared/lib/hex.js';
import SignalCrypto from '@ephemera/shared/lib/signal_crypto.js';
import { KeyedCache } from '@ephemera/shared/lib/keyed_cache.js';
import Base37 from '@ephemera/shared/lib/base37.js';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import SafeFetch from '@ephemera/shared/lib/safe_fetch.js';

export interface IPeerService {
  publish(signal: ServerSignal): Promise<void>;

  handle(signal: ServerSignal): Promise<void>;

  getPeerDescriptor(): PeerManifest;

  getRemoteServers(): Promise<PeerManifest[]>;
}

export class PeerService implements IPeerService {
  private config: Config;
  private database: MySql2Database;
  private grpcClient: PubSubServiceClient;
  private stream: grpc.ClientReadableStream<Message>;
  // host -> peerDescriptor
  private peerDescriptorCache = new KeyedCache<string, PeerManifest>({
    maxSize: 128,
  });
  private static readonly kMaxRemotePosts = 65535;

  constructor(config: Config, database: MySql2Database) {
    this.config = config;
    this.database = database;
    this.grpcClient = new PubSubServiceClient(
      this.config.peerHost,
      grpc.credentials.createInsecure()
    );

    this.stream = this.openStream();
  }

  async publish(signal: ServerSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const message = { data: JSON.stringify(signal) };
      this.grpcClient.publish(message, (err) => {
        if (err) {
          console.error('Failed to publish message:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private openStream(): grpc.ClientReadableStream<Message> {
    const stream = this.grpcClient.streamMessages({});
    let reconnectScheduled = false;

    const reconnect = (reason: string, err?: unknown) => {
      if (reconnectScheduled) {
        return;
      }
      reconnectScheduled = true;

      if (err) {
        console.error(`gRPC stream ${reason}:`, err);
      } else {
        console.warn(`gRPC stream ${reason}, reconnecting...`);
      }

      setTimeout(() => {
        if (this.stream === stream) {
          this.stream = this.openStream();
        }
      }, 1000);
    };

    stream.on('data', async (message: Message) => {
      const signal = serverSignalSchema.safeParse(JSON.parse(message.data));

      if (!signal.success) {
        return;
      }

      await this.handle(signal.data);
    });

    stream.on('error', (err) => {
      reconnect('error', err);
    });

    stream.on('end', () => {
      reconnect('ended');
    });

    return stream;
  }

  async fetchPeerDescriptor(host: string): Promise<PeerManifest> {
    return this.peerDescriptorCache.getOrSet(host, async () => {
      const response = await SafeFetch.safeFetch(`https://${host}/api/v1/peer`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch peer descriptor from ${host}: ${response.statusText}`);
      }

      const data = await response.json();
      return getPeerResponseSchema.parse(data);
    });
  }

  async handleRelay(signal: RelaySignal): Promise<void> {
    // Verify client signature
    if (!(await SignalCrypto.verify(signal[0][2]))) {
      // Failed to verify client signature
      return;
    }

    if (signal[0][2][0][1][0] !== signal[0][1][0]) {
      // Host mismatch between server signal and client signal
      return;
    }

    if (signal[0][2][0][1][3] === 'create_post') {
      const createPostSignal = createPostSignalSchema.safeParse(signal[0][2]);

      if (!createPostSignal.success) {
        return;
      }

      const inner = createPostSignal.data;

      await this.database.insert(remotePosts).values({
        id: Hex.fromUint8Array(await SignalCrypto.digest(inner[0])),
        version: inner[0][0],
        host: inner[0][1][0],
        author: inner[0][1][1],
        content: inner[0][2],
        footer: inner[0][3],
        signature: inner[1],
        createdAt: inner[0][1][2],
        serverID: Hex.fromUint8Array(await SignalCrypto.digestServer(signal[0])),
        serverVersion: signal[0][0],
        serverCreatedAt: signal[0][1][2],
        serverPublicKey: signal[0][1][1],
        serverSignature: signal[1],
        serverFooter: signal[0][3],
      });

      const c = (await this.database
        .select({ c: count() })
        .from(remotePosts))[0]?.c;

      if (c !== undefined && Number(c) > PeerService.kMaxRemotePosts) {
        const over = Number(c) - PeerService.kMaxRemotePosts;

        const oldIds = await this.database
          .select({ id: remotePosts.id })
          .from(remotePosts)
          .orderBy(asc(remotePosts.insertedAt))
          .limit(over);

        if (oldIds.length > 0) {
          await this.database
            .delete(remotePosts)
            .where(inArray(remotePosts.id, oldIds.map(r => r.id)));
        }
      }
    } else if (signal[0][2][0][1][3] === 'delete_post') {
      const deletePostSignal = deletePostSignalSchema.safeParse(signal[0][2]);

      if (!deletePostSignal.success) {
        return;
      }

      const inner = deletePostSignal.data;

      await this.database.delete(remotePosts)
        .where(and(eq(remotePosts.id, inner[0][2][0]), eq(remotePosts.author, inner[0][1][1])))
        .execute();
    }
  }

  async handle(signal: ServerSignal): Promise<void> {
    const peerDescriptor = await this.fetchPeerDescriptor(signal[0][1][0]);

    // Verify server signature
    if (!(await SignalCrypto.verifyServer(signal, Base37.toUint8Array(peerDescriptor.publicKey)))) {
      // Failed to verify server signature
      return;
    }

    if (signal[0][1][3] === 'relay') {
      const relaySignal = relaySignalSchema.safeParse(signal);

      if (!relaySignal.success) {
        return;
      }

      await this.handleRelay(relaySignal.data);
    }
  }

  getPeerDescriptor(): PeerManifest {
    return {
      implementation: {
        name: 'ephemera',
        version: import.meta.env.EPHEMERA_COMMIT_HASH
      },
      host: this.config.host,
      publicKey: this.config.publicKey,
    };
  }

  async getRemoteServers(): Promise<PeerManifest[]> {
    const hosts = await new Promise<string[]>((resolve, reject) => {
      this.grpcClient.getRemoteServers({}, (err, response) => {
        if (err) {
          console.error('Failed to get remote servers:', err);
          reject(err);
        } else {
          resolve(response.hosts);
        }
      });
    });

    const results = await Promise.allSettled(
      hosts.map(host => this.fetchPeerDescriptor(host))
    );

    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
  }
}