import { createStoreContext, Store } from "../lib/store.js";

import Crypto, { type KeyPair } from '@ephemera/shared/lib/crypto.js';
import Client from '@ephemera/shared/lib/client.js';
import type { ExportedKeyPair, PostSignal } from "@ephemera/shared/api/api";
import Base37 from "@ephemera/shared/lib/base37";

export class EphemeraStore extends Store {
  private _keyPair: KeyPair | null = null;

  constructor() {
    super();
  }

  get keyPair(): KeyPair | null {
    return this._keyPair;
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

    localStorage.removeItem('ephemera_publicKey');
    localStorage.removeItem('ephemera_privateKey');
    this.notifyListeners();
  }

  prepareKeyPair() {
    if (this._keyPair) {
      return;
    }

    const localStorage = this.getLocalStorage();

    const publicKeyData = localStorage.getItem('ephemera_publicKey');
    const privateKeyData = localStorage.getItem('ephemera_privateKey');

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

    localStorage.setItem('ephemera_publicKey', JSON.stringify(Array.from(keyPair.publicKey)));
    localStorage.setItem('ephemera_privateKey', JSON.stringify(Array.from(keyPair.privateKey)));

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

    localStorage.setItem('ephemera_publicKey', JSON.stringify(Array.from(publicKey)));
    localStorage.setItem('ephemera_privateKey', JSON.stringify(Array.from(privateKey)));

    this.notifyListeners();
  }
}

export const EphemeraStoreContext = createStoreContext(EphemeraStore);