import { createStoreContext, Store } from "../lib/store.js";

import Crypto, { type KeyPair } from '@ephemera/shared/lib/crypto.js';
import Client from '@ephemera/shared/lib/client.js';
import type { ExportedKeyPair, CreatePostSignal } from "@ephemera/shared/api/api";
import Base37 from "@ephemera/shared/lib/base37";
import z from "zod";

export interface LogEntry {
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
  id: number;
}

const v1IdentitySchema = z.object({
  publicKey: z.string(),
  privateKey: z.string(),
  createdAt: z.number(),
});

export class EphemeraStore extends Store {
  private _keyPairs: Record<string, KeyPair> = {};
  private _logEntries: LogEntry[] = [];
  private _nextLogId: number = 0;
  private _kMaxLogEntries: number = 8;
  private _processingQueue: Promise<void> = Promise.resolve();
  private _db: IDBDatabase | null = null;
  private _initialized: boolean = false;

  private _kDBName = 'ephemera';
  private _kIdentitiesStoreName = 'identities';
  private _kDBVersion = 1;

  private _kPublicKeyStorageKey = 'ephemera_publicKey';
  private _kPrivateKeyStorageKey = 'ephemera_privateKey';

  constructor() {
    super();
  }

  get keyPairs(): Record<string, KeyPair> {
    return this._keyPairs;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this._processingQueue = this._processingQueue.then(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    await this.enqueue(async () => {
      const db = await this.openDB();
      this._db = db;

      const identities = await new Promise<{ publicKey: string; privateKey: string }[]>((resolve, reject) => {
        const tx = db.transaction(this._kIdentitiesStoreName, 'readonly');
        const store = tx.objectStore(this._kIdentitiesStoreName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      for (const identity of identities) {
        const parseResult = v1IdentitySchema.safeParse(identity);

        if (!parseResult.success) {
          continue;
        }

        const { publicKey, privateKey } = parseResult.data;

        this._keyPairs[publicKey] = {
          publicKey: Base37.toUint8Array(publicKey),
          privateKey: Base37.toUint8Array(privateKey),
        };
      }

      this._initialized = true;
      this.notifyListeners();

      // If no identities exist, generate a new one
      if (identities.length === 0) {
        await this._generateKeyPair();
      }
    });
  }

  get logEntries(): LogEntry[] {
    return this._logEntries;
  }

  addLog(type: 'success' | 'danger' | 'warning' | 'info', message: string) {
    this._logEntries = [
      ...this._logEntries,
      {
        type,
        message,
        id: this._nextLogId++,
      }
    ];

    if (this._logEntries.length > this._kMaxLogEntries) {
      this._logEntries = this._logEntries.slice(-this._kMaxLogEntries);
    }

    this.notifyListeners();
  }

  removeLog(id: number) {
    this._logEntries = this._logEntries.filter((entry) => entry.id !== id);

    this.notifyListeners();
  }

  getLocalStorage() {
    if (!globalThis.localStorage) {
      throw new Error("localStorage is not available");
    }

    return globalThis.localStorage;
  }

  getDB(): IDBDatabase {
    if (!this._db) {
      throw new Error("Database is not initialized");
    }

    return this._db;
  }

  async revokeKeyPair(publicKey: string): Promise<void> {
    await this.enqueue(async () => {
      const db = this.getDB();

      const tx = db.transaction(this._kIdentitiesStoreName, 'readwrite');
      const store = tx.objectStore(this._kIdentitiesStoreName);

      await new Promise<void>((resolve, reject) => {
        const request = store.delete(publicKey);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this._keyPairs = Object.fromEntries(Object.entries(this._keyPairs).filter(([key]) => key !== publicKey));
      this.notifyListeners();
    });
  }

  async generateKeyPair(): Promise<void> {
    await this.enqueue(() => this._generateKeyPair());
  }

  async _generateKeyPair(): Promise<void> {
    const keyPair = Crypto.generateKeyPair();

    const db = this.getDB();

    const tx = db.transaction(this._kIdentitiesStoreName, 'readwrite');
    const store = tx.objectStore(this._kIdentitiesStoreName);

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        publicKey: Base37.fromUint8Array(keyPair.publicKey),
        privateKey: Base37.fromUint8Array(keyPair.privateKey),
        createdAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    this._keyPairs = {
      ...this._keyPairs,
      [Base37.fromUint8Array(keyPair.publicKey)]: keyPair,
    };
    this.notifyListeners();
  }

  getClient(): Client {
    return new Client(window.location.host);
  }

  exportKeyPair(keyPair: KeyPair): ExportedKeyPair {
    return {
      publicKey: Base37.fromUint8Array(keyPair.publicKey),
      privateKey: Base37.fromUint8Array(keyPair.privateKey),
    };
  }

  async importKeyPair(exported: ExportedKeyPair) {
    const publicKey = Base37.toUint8Array(exported.publicKey);
    const privateKey = Base37.toUint8Array(exported.privateKey);
    const keyPair = { publicKey, privateKey };

    if (!Crypto.isValidKeyPair(keyPair)) {
      throw new Error("Invalid key pair");
    }

    await this.enqueue(async () => {
      const db = this.getDB();

      const tx = db.transaction(this._kIdentitiesStoreName, 'readwrite');
      const store = tx.objectStore(this._kIdentitiesStoreName);

      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          publicKey: exported.publicKey,
          privateKey: exported.privateKey,
          createdAt: Date.now(),
        });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this._keyPairs = {
        ...this._keyPairs,
        [exported.publicKey]: keyPair
      };
      this.notifyListeners();
    });
  }

  getHost(): string | null {
    if (!globalThis.location) {
      return null;
    }

    return window.location.host;
  }

  private async migrateFromLocalStorage(db: IDBDatabase): Promise<void> {
    const localStorage = this.getLocalStorage();

    const publicKeyData = localStorage.getItem(this._kPublicKeyStorageKey);
    const privateKeyData = localStorage.getItem(this._kPrivateKeyStorageKey);

    if (!publicKeyData || !privateKeyData) {
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._kIdentitiesStoreName, 'readwrite');
      const store = tx.objectStore(this._kIdentitiesStoreName);

      const publicKeyArray: number[] = JSON.parse(publicKeyData);
      const privateKeyArray: number[] = JSON.parse(privateKeyData);

      const keyPair = {
        publicKey: new Uint8Array(publicKeyArray),
        privateKey: new Uint8Array(privateKeyArray),
      };

      const request = store.put({
        publicKey: Base37.fromUint8Array(keyPair.publicKey),
        privateKey: Base37.fromUint8Array(keyPair.privateKey),
        createdAt: Date.now(),
      });

      request.onsuccess = () => {
        localStorage.removeItem(this._kPublicKeyStorageKey);
        localStorage.removeItem(this._kPrivateKeyStorageKey);
        this.addLog('success', 'Migrated key pair from localStorage to IndexedDB');
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this._kDBName, this._kDBVersion);
      request.onupgradeneeded = (e) => {
        const db = request.result;
        const oldVersion = e.oldVersion;
        const newVersion = e.newVersion;

        if (oldVersion < 1) {
          db.createObjectStore(this._kIdentitiesStoreName, { keyPath: 'publicKey' });
        }
      };

      request.onsuccess = async () => {
        const db = request.result;

        try {
          await this.migrateFromLocalStorage(db);
          resolve(db);
        } catch (e) {
          reject(e);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }
}

export const EphemeraStoreContext = createStoreContext(EphemeraStore);