import { ed25519 } from '@noble/curves/ed25519.js';

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export default class Crypto {
  /**
   * Generates a new Ed25519 key pair.
   */
  static generateKeyPair(): KeyPair {
    const privateKey = ed25519.utils.randomSecretKey();
    const publicKey = ed25519.getPublicKey(privateKey);
    return {
      publicKey,
      privateKey,
    };
  }

  /**
   * Signs the message with the given private key and returns the signature.
   */
  static sign(message: Uint8Array, privateKey: Uint8Array): Uint8Array {
    return ed25519.sign(message, privateKey);
  }

  /**
   * Checks whether the signature is valid for the given message and public key.
   */
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
  static async digest(data: Uint8Array): Promise<Uint8Array> {
    // crypto.subtle.digest takes TypedArray, so this is safe
    return new Uint8Array(await crypto.subtle.digest('SHA-256', data as BufferSource));
  }

  /**
   * Returns whether the given key pair is valid as Ed25519 keys.
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

  /**
   * Returns whether the given byte array is a valid Ed25519 public key.
   */
  static isValidPublicKey(publicKey: Uint8Array): boolean {
    try {
      ed25519.Point.fromBytes(publicKey);
      return true;
    } catch {
      return false;
    }
  }
}