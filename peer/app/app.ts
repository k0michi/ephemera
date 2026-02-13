import { createLibp2p, type Libp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@libp2p/noise';
import { yamux } from '@libp2p/yamux';
import { kadDHT } from '@libp2p/kad-dht';
import { ping } from '@libp2p/ping';
import { identify } from '@libp2p/identify';
import { bootstrap } from '@libp2p/bootstrap'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr';

export class Config {
  internalHostname: string;
  internalPort: number;
  externalHostname: string;
  externalPort: number;
  bootstrapPeers: string[];

  constructor({
    internalHostname,
    internalPort,
    externalHostname,
    externalPort,
    bootstrapPeers
  }: {
    internalHostname: string;
    internalPort: number;
    externalHostname: string;
    externalPort: number;
    bootstrapPeers: string[];
  }) {
    this.internalHostname = internalHostname;
    this.internalPort = internalPort;
    this.externalHostname = externalHostname;
    this.externalPort = externalPort;
    this.bootstrapPeers = bootstrapPeers;
  }

  static fromEnv(): Config {
    const internalHostname = process.env.EPHEMERA_INTERNAL_HOSTNAME ?? '0.0.0.0';
    const internalPort = Number(process.env.EPHEMERA_INTERNAL_PORT ?? '8080');
    const externalHostname = process.env.EPHEMERA_EXTERNAL_HOSTNAME ?? 'localhost';
    const externalPort = Number(process.env.EPHEMERA_EXTERNAL_PORT ?? '443');
    const bootstrapPeersEnv = process.env.EPHEMERA_BOOTSTRAP_PEERS ?? '';
    const bootstrapPeers = bootstrapPeersEnv.split(',').map(s => s.trim()).filter(s => s.length > 0);

    return new Config({
      internalHostname,
      internalPort,
      externalHostname,
      externalPort,
      bootstrapPeers
    });
  }
}

export default class EphemeraPeer {
  private libp2pNode: Libp2p | null = null;
  private options: Config;

  public constructor(options: Config) {
    this.options = options;
  }

  get internalHostname(): string {
    return this.options.internalHostname;
  }

  get internalPort(): number {
    return this.options.internalPort;
  }

  get externalHostname(): string {
    return this.options.externalHostname;
  }

  get externalPort(): number {
    return this.options.externalPort;
  }

  public async start(): Promise<void> {
    this.libp2pNode = await createLibp2p({
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
      }
    });

    await this.libp2pNode.start();
    console.log(this.libp2pNode.peerId.toString());
    console.log(this.libp2pNode.getMultiaddrs().map(a => a.toString()));

    this.libp2pNode.addEventListener('peer:connect', (evt) => {
      const connection = evt.detail;
      console.log(`Connected to peer: ${connection.publicKey?.toString()}`);
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