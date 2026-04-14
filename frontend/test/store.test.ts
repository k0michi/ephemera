import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { EphemeraStore } from '../app/store.js';
import Base37 from "@ephemera/shared/lib/base37";
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';

describe('EphemeraStore', () => {
  let store: EphemeraStore;

  beforeEach(async () => {
    localStorage.clear();

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('ephemera');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => {
        reject(new Error('IndexedDB delete blocked'));
      };
    });

    store = new EphemeraStore();
  });

  afterEach(() => {
    store[Symbol.dispose]();
  });

  it('should migrate data from localStorage to IndexedDB during v0 to v1 upgrade', async () => {
    const mockPublicKeyArray = [1, 2, 3, 4, 5];
    const mockPrivateKeyArray = [9, 8, 7, 6, 5];

    const expectedPublicKeyStr = Base37.fromUint8Array(new Uint8Array(mockPublicKeyArray));
    const expectedPrivateKeyStr = Base37.fromUint8Array(new Uint8Array(mockPrivateKeyArray));

    localStorage.setItem('ephemera_publicKey', JSON.stringify(mockPublicKeyArray));
    localStorage.setItem('ephemera_privateKey', JSON.stringify(mockPrivateKeyArray));

    await store.initialize();

    const pairs = store.keyPairs;
    expect(pairs[expectedPublicKeyStr]).toBeDefined();
    expect(Base37.fromUint8Array(NullableHelper.unwrap(pairs[expectedPublicKeyStr]).privateKey)).toBe(expectedPrivateKeyStr);

    expect(localStorage.getItem('ephemera_publicKey')).toBeNull();
    expect(localStorage.getItem('ephemera_privateKey')).toBeNull();
  });

  it('should generate a new key if no identities exist in localStorage or DB', async () => {
    await store.initialize();

    const ids = Object.keys(store.keyPairs);
    expect(ids.length).toBe(1);
  });
});