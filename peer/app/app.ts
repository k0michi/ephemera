import { createLibp2p, type Libp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@libp2p/noise';
import { yamux } from '@libp2p/yamux';
import { KadDHT, kadDHT } from '@libp2p/kad-dht';
import { Ping, ping } from '@libp2p/ping';
import { Identify, identify } from '@libp2p/identify';
import { bootstrap } from '@libp2p/bootstrap'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr';
import HostUtil from '@ephemera/shared/lib/host_util.js';
import Config from './config.js';
import { Message, PubSubServiceServer, PubSubServiceService } from '@ephemera/shared/peer/bridge.js';
import grpc from '@grpc/grpc-js';
import { GossipSub, gossipsub, Message as libp2pMessage } from '@libp2p/gossipsub';
import { EventTargetReadable } from './event_target_readable.js';
import { pipeline } from "node:stream/promises";
import { Transform, Writable } from 'node:stream';
import Base37 from '@ephemera/shared/lib/base37.js';
import { keys } from '@libp2p/crypto';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import { KEEP_ALIVE } from '@libp2p/interface'

export function getHostFromMultiaddr(addr: Multiaddr): [string, number] | null {
  let hostname: string | null = null;
  let port: number | null = null;

  for (const c of addr.getComponents()) {
    // TODO: other components?
    if (c.name === 'dns') {
      hostname = c.value ?? null;
    }

    if (c.name === 'tcp') {
      port = NullableHelper.map(c.value, (v) => parseInt(v)) ?? null;
    }
  }

  if (hostname && port) {
    return [hostname, port];
  } else {
    return null;
  }
}

interface Peer {
  id: string;
  multiaddrs: Multiaddr[];
  host: [string, number];
}

export default class EphemeraPeer {
  private libp2pNode: Libp2p<{
    ping: Ping;
    identify: Identify;
    dht: KadDHT;
    pubsub: GossipSub;
  }> | null = null;
  private options: Config;
  private verifiedPeers: Map<string, Peer> = new Map();

  public constructor(options: Config) {
    this.options = options;
  }

  get internalHostname(): string {
    return HostUtil.parse(this.options.internalHost).hostname;
  }

  get internalPort(): number {
    return HostUtil.parse(this.options.internalHost).port;
  }

  get externalHostname(): string {
    return HostUtil.parse(this.options.externalHost).hostname;
  }

  get externalPort(): number {
    return HostUtil.parse(this.options.externalHost).port;
  }

  public async start(): Promise<void> {
    const privateKey = Base37.toUint8Array(this.options.privateKey);

    this.libp2pNode = await createLibp2p({
      privateKey: keys.privateKeyFromRaw(privateKey),
      addresses: {
        listen: [`/ip4/${this.internalHostname}/tcp/${this.internalPort}/ws`],
        announce: [
          `/dns/${this.externalHostname}/tcp/${this.externalPort}/wss`
        ],
      },
      transports: [webSockets()],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      peerDiscovery:
        this.options.bootstrapPeers.length > 0 ? [
          bootstrap({
            list: this.options.bootstrapPeers,
            tagName: `${KEEP_ALIVE}-bootstrap`,
            tagValue: 100,
          })
        ] : [],
      services: {
        ping: ping(),
        identify: identify(),
        dht: kadDHT({
          clientMode: false,
          validators: {
          },
        }),
        pubsub: gossipsub(),
      },
      connectionManager: {
        reconnectRetries: 20,
      },
    });

    await this.libp2pNode.start();
    console.log(this.libp2pNode.peerId.toString());
    console.log(this.libp2pNode.getMultiaddrs().map(a => a.toString()));

    this.libp2pNode.addEventListener('peer:connect', (evt) => {
      const connection = evt.detail;
      console.log(`Connected to peer: ${connection.publicKey?.toString()}`);
    });

    this.libp2pNode.addEventListener('peer:identify', (evt) => {
      const detail = evt.detail;
      console.log(`Identified peer: ${detail.peerId.toString()} with protocols: ${detail.protocols.join(', ')}`);
      const record = detail.signedPeerRecord;
      console.log(`Peer record for ${detail.peerId.toString()}:`);
      for (const multiaddr of record?.addresses ?? []) {
        console.log(`  - ${multiaddr.toString()}`);
      }

      if (record === undefined) {
        console.warn(`No signed peer record found for peer ${detail.peerId.toString()}`);
        return;
      }

      if (record?.addresses.length === 0) {
        console.warn(`No addresses found for peer ${detail.peerId.toString()}`);
        return;
      }

      const host = getHostFromMultiaddr(record.addresses[0]);

      if (host === null) {
        console.warn(`Failed to extract host from multiaddr for peer ${detail.peerId.toString()}`);
        return;
      }

      this.verifiedPeers.set(detail.peerId.toString(), {
        id: detail.peerId.toString(),
        multiaddrs: (record?.addresses ?? []).map((a) => a),
        host: host,
      });
    });

    this.libp2pNode.addEventListener('peer:disconnect', async (evt) => {
      const connection = evt.detail;
      console.log(`Disconnected from peer: ${connection.publicKey?.toString()}`);

      this.verifiedPeers.delete(connection.toString());
    });

    this.libp2pNode.services.pubsub.subscribe('broadcast');

    const serverImpl: PubSubServiceServer = {
      publish: async (request, callback) => {
        const encoder = new TextEncoder();
        try {
          await this.libp2pNode?.services.pubsub.publish('broadcast', encoder.encode(request.request.data));
        } catch (err) {
          console.warn('Publish failed:', err instanceof Error ? err.message : err);
          callback(null, { ok: false, error: err instanceof Error ? err.message : String(err) });
          return;
        }

        callback(null, { ok: true, error: '' });
      },
      streamMessages: async (request) => {
        const readable = new EventTargetReadable(NullableHelper.unwrap(this.libp2pNode?.services.pubsub), 'message');

        await pipeline(
          readable,
          new Transform({
            objectMode: true,
            transform(event, encoding, callback) {
              const pubsubMessage = (event as CustomEvent<libp2pMessage>);

              if (pubsubMessage.detail.topic !== 'broadcast') {
                callback();
                return;
              }

              const decoder = new TextDecoder();
              const data = decoder.decode(pubsubMessage.detail.data);
              console.log('Received message:', data);
              const message: Message = {
                data: data,
              };
              callback(null, message);
            }
          }),
          request as Writable
        );
      },
      getRemoteServers: async (request, callback) => {
        const hosts = Array.from(this.verifiedPeers.values()).map(peer => HostUtil.stringify({
          hostname: peer.host[0],
          port: peer.host[1],
        }));
        callback(null, {
          hosts: hosts,
        });
      }
    };

    const server = new grpc.Server();
    server.addService(PubSubServiceService, serverImpl);

    server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        console.error('Failed to start gRPC server:', err);
        return;
      }
      console.log(`gRPC server is listening on port ${port}`);
    });
  }

  get multiaddr(): Multiaddr {
    if (!this.libp2pNode) {
      throw new Error('Libp2p node is not started yet.');
    }

    return this.libp2pNode.getMultiaddrs()[0];
  }
}

const node = new EphemeraPeer(
  Config.fromEnv()
);
await node.start();