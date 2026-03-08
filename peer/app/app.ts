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
import { GossipSub, gossipsub, GossipsubMessage } from '@libp2p/gossipsub';
import { EventTargetReadable } from './event_target_readable.js';
import { pipeline } from "node:stream/promises";
import { Transform, Writable } from 'node:stream';
import Base37 from '@ephemera/shared/lib/base37.js';
import { keys } from '@libp2p/crypto';

export default class EphemeraPeer {
  private libp2pNode: Libp2p<{
    ping: Ping;
    identify: Identify;
    dht: KadDHT;
    pubsub: GossipSub;
  }> | null = null;
  private options: Config;

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
          `/dns4/${this.externalHostname}/tcp/${this.externalPort}/wss`
        ],
      },
      transports: [webSockets()],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      peerDiscovery: this.options.bootstrapPeers.map((addr) => bootstrap({ list: [addr] })),
      services: {
        ping: ping(),
        identify: identify(),
        dht: kadDHT({
          clientMode: false,
          validators: {
          },
        }),
        pubsub: gossipsub(),
      }
    });

    await this.libp2pNode.start();
    console.log(this.libp2pNode.peerId.toString());
    console.log(this.libp2pNode.getMultiaddrs().map(a => a.toString()));

    this.libp2pNode.addEventListener('peer:connect', (evt) => {
      const connection = evt.detail;
      console.log(`Connected to peer: ${connection.publicKey?.toString()}`);
    });

    const readable = new EventTargetReadable(this.libp2pNode?.services.pubsub, 'message');
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
        await pipeline(
          readable,
          new Transform({
            objectMode: true,
            transform(event, encoding, callback) {
              const pubsubMessage = (event as GossipsubMessage);
              const decoder = new TextDecoder();
              const data = decoder.decode(pubsubMessage.msg.data);
              const message: Message = {
                data: data,
              };
              callback(null, message);
            }
          }),
          request as Writable
        );
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