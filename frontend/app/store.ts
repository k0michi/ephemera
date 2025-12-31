import { createStoreContext, Store } from "../lib/store.js";

import Crypto, { type KeyPair } from '@ephemera/shared/lib/crypto.js';
import Client from '@ephemera/shared/lib/client.js';
import type { ExportedKeyPair, CreatePostSignal } from "@ephemera/shared/api/api";
import Base37 from "@ephemera/shared/lib/base37";

export interface LogEntry {
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
  id: number;
}

export class EphemeraStore extends Store {
  private _keyPair: KeyPair | null = null;
  private _kPublicKeyStorageKey = 'ephemera_publicKey';
  private _kPrivateKeyStorageKey = 'ephemera_privateKey';
  private _logEntries: LogEntry[] = [];
  private _nextLogId: number = 0;
  private _kMaxLogEntries: number = 8;

  constructor() {
    super();
  }

  get keyPair(): KeyPair | null {
    return this._keyPair;
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

  revokeKeyPair() {
    this._keyPair = null;

    const localStorage = this.getLocalStorage();

    localStorage.removeItem(this._kPublicKeyStorageKey);
    localStorage.removeItem(this._kPrivateKeyStorageKey);
    this.notifyListeners();
  }

  prepareKeyPair() {
    if (this._keyPair) {
      return;
    }

    const localStorage = this.getLocalStorage();

    const publicKeyData = localStorage.getItem(this._kPublicKeyStorageKey);
    const privateKeyData = localStorage.getItem(this._kPrivateKeyStorageKey);

    if (publicKeyData && privateKeyData) {
      const publicKeyArray: number[] = JSON.parse(publicKeyData);
      const privateKeyArray: number[] = JSON.parse(privateKeyData);

      this._keyPair = {
        publicKey: new Uint8Array(publicKeyArray),
        privateKey: new Uint8Array(privateKeyArray),
      };
      this.notifyListeners();
      return;
    }

    const keyPair = Crypto.generateKeyPair();
    this._keyPair = keyPair;

    localStorage.setItem(this._kPublicKeyStorageKey, JSON.stringify(Array.from(keyPair.publicKey)));
    localStorage.setItem(this._kPrivateKeyStorageKey, JSON.stringify(Array.from(keyPair.privateKey)));

    this.notifyListeners();
  }

  /**
   * @throws Error if sending the post fails.
   */
  async sendPost(post: string): Promise<void> {
    if (!this._keyPair) {
      throw new Error("Key pair is not prepared");
    }

    const client = new Client(window.location.host, this._keyPair);
    await client.sendPost(post);
  }

  getClient(): Client {
    return new Client(window.location.host, this._keyPair);
  }

  exportKeyPair(): ExportedKeyPair | null {
    if (!this._keyPair) {
      return null;
    }

    return {
      publicKey: Base37.fromUint8Array(this._keyPair.publicKey),
      privateKey: Base37.fromUint8Array(this._keyPair.privateKey),
    };
  }

  importKeyPair(exported: ExportedKeyPair) {
    const publicKey = Base37.toUint8Array(exported.publicKey);
    const privateKey = Base37.toUint8Array(exported.privateKey);
    const keyPair = { publicKey, privateKey };

    if (!Crypto.isValidKeyPair(keyPair)) {
      throw new Error("Invalid key pair");
    }

    this._keyPair = keyPair;

    const localStorage = this.getLocalStorage();

    localStorage.setItem(this._kPublicKeyStorageKey, JSON.stringify(Array.from(publicKey)));
    localStorage.setItem(this._kPrivateKeyStorageKey, JSON.stringify(Array.from(privateKey)));

    this.notifyListeners();
  }
}

export const EphemeraStoreContext = createStoreContext(EphemeraStore);