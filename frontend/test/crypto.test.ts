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

  it('digest should compute correct SHA-256 hash', async () => {
    const data = new Uint8Array([97]); // 'a'
    const hash = await Crypto.digest(data);
    const expectedHex = 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb';
    const hashHex = Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
    expect(hashHex).toBe(expectedHex);
  });

  it('digest should produce different hashes for different inputs', async () => {
    const data1 = new Uint8Array([97]);
    const data2 = new Uint8Array([98]);
    const hash1 = await Crypto.digest(data1);
    const hash2 = await Crypto.digest(data2);
    expect(hash1).not.toEqual(hash2);
  });

  it('digest should be consistent for the same input', async () => {
    const data = new Uint8Array([97, 98, 99]);
    const hash1 = await Crypto.digest(data);
    const hash2 = await Crypto.digest(data);
    expect(hash1).toEqual(hash2);
  });
});
