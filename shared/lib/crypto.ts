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
    try {
      return ed25519.verify(signature, message, publicKey);
    } catch {
      return false;
    }
  }

  /**
   * Computes the SHA-256 digest of the input data.
   */
  static async digest(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  }

  /**
   * Returns whether the given key pair is valid.
   */
  static isValidKeyPair(keyPair: KeyPair): boolean {
    try {
      const derivedPublicKey = ed25519.getPublicKey(keyPair.privateKey);
      return (
        derivedPublicKey.length === keyPair.publicKey.length &&
        derivedPublicKey.every((byte, index) => byte === keyPair.publicKey[index])
      );
    } catch {
      return false;
    }
  }

  static isValidPublicKey(publicKey: Uint8Array): boolean {
    try {
      ed25519.Point.fromBytes(publicKey);
      return true;
    } catch {
      return false;
    }
  }
}