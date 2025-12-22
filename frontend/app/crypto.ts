import { ed25519 } from '@noble/curves/ed25519.js';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export default class Crypto {
  static generateKeyPair(): KeyPair {
    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = ed25519.getPublicKey(privateKey);
    return {
      publicKey,
      privateKey,
    };
  }

  static sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
    return ed25519.sign(message, privateKey);
  }

  static verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): boolean {
    return ed25519.verify(signature, message, publicKey);
  }
}