import { describe, it, expect } from 'vitest';
import Crypto, { type KeyPair } from '../app/crypto';

describe('Crypto', () => {
  it('generateKeyPair should generate a valid key pair', () => {
    const keyPair: KeyPair = Crypto.generateKeyPair();
    expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);

    const signed = Crypto.sign(new Uint8Array([1, 2, 3]), keyPair.privateKey);
    const isValid = Crypto.verify(new Uint8Array([1, 2, 3]), signed, keyPair.publicKey);
    expect(isValid).toBe(true);
  });

  it('verify should return false for invalid signatures', () => {
    const keyPair: KeyPair = Crypto.generateKeyPair();
    const signed = Crypto.sign(new Uint8Array([1, 2, 3]), keyPair.privateKey);
    const isValid = Crypto.verify(new Uint8Array([4, 5, 6]), signed, keyPair.publicKey);
    expect(isValid).toBe(false);
  });

  it('verify should return false for tampered signatures', () => {
    const keyPair: KeyPair = Crypto.generateKeyPair();
    const signed = Crypto.sign(new Uint8Array([1, 2, 3]), keyPair.privateKey);
    signed[0] ^= 0x01;
    const isValid = Crypto.verify(new Uint8Array([1, 2, 3]), signed, keyPair.publicKey);
    expect(isValid).toBe(false);
  });
});
