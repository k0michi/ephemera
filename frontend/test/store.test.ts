import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EphemeraStore } from '../app/store';
import Crypto, { type KeyPair } from '../../shared/lib/crypto.js';

const mockKeyPair = {
  publicKey: new Uint8Array([1, 2, 3]),
  privateKey: new Uint8Array([4, 5, 6]),
};

vi.spyOn(Crypto, 'generateKeyPair').mockReturnValue(mockKeyPair);

describe('EphemeraStore', () => {
  let store: EphemeraStore;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    store = new EphemeraStore();
    localStorageMock = {};

    globalThis.localStorage = {
      getItem: (k: string) => localStorageMock[k] ?? null,
      setItem: (k: string, v: string) => { localStorageMock[k] = v; },
      removeItem: (k: string) => { delete localStorageMock[k]; },
      clear: () => { localStorageMock = {}; },
      key: () => null,
      length: 0,
    } as any;
  });

  describe('prepareKeyPair', () => {
    it('should generate and store keyPair if not present', () => {
      store.prepareKeyPair();
      expect(store.keyPair).toEqual(mockKeyPair);
      expect(localStorageMock['ephemera_publicKey']).toBe(JSON.stringify(Array.from(mockKeyPair.publicKey)));
      expect(localStorageMock['ephemera_privateKey']).toBe(JSON.stringify(Array.from(mockKeyPair.privateKey)));
    });

    it('should load keyPair from localStorage if present', () => {
      localStorageMock['ephemera_publicKey'] = JSON.stringify([9, 8, 7]);
      localStorageMock['ephemera_privateKey'] = JSON.stringify([6, 5, 4]);
      store.prepareKeyPair();
      expect(store.keyPair).toEqual({
        publicKey: new Uint8Array([9, 8, 7]),
        privateKey: new Uint8Array([6, 5, 4]),
      });
    });

    it('should not regenerate keyPair if already present', () => {
      store.prepareKeyPair();
      store.revokeKeyPair();
      expect(store.keyPair).toBeNull();
      expect(localStorageMock['ephemera_publicKey']).toBeUndefined();
      expect(localStorageMock['ephemera_privateKey']).toBeUndefined();
    });
  });
});
