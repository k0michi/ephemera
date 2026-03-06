
import EnvParser from '@ephemera/shared/lib/env_parser.js';

export default class Config {
  internalHost: string;
  externalHost: string;
  privateKey: string;
  publicKey: string;
  bootstrapPeers: string[];

  constructor({
    internalHost,
    externalHost,
    privateKey,
    publicKey,
    bootstrapPeers
  }: {
    internalHost: string;
    externalHost: string;
    privateKey: string;
    publicKey: string;
    bootstrapPeers: string[];
  }) {
    this.internalHost = internalHost;
    this.externalHost = externalHost;
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.bootstrapPeers = bootstrapPeers;
  }

  static fromEnv(): Config {
    const parser = new EnvParser(process.env);
    const internalHost = parser.getStringOptional('EPHEMERA_INTERNAL_HOST', '0.0.0.0:8080');
    const externalHost = parser.getStringOptional('EPHEMERA_EXTERNAL_HOST', 'localhost:443');
    const privateKey = parser.getStringRequired('EPHEMERA_PRIVATE_KEY');
    const publicKey = parser.getStringRequired('EPHEMERA_PUBLIC_KEY');
    const bootstrapPeersEnv = parser.getStringOptional('EPHEMERA_BOOTSTRAP_PEERS', '');
    const bootstrapPeers = bootstrapPeersEnv.split(',').map(s => s.trim()).filter(s => s.length > 0);

    return new Config({
      internalHost,
      externalHost,
      privateKey,
      publicKey,
      bootstrapPeers
    });
  }
}