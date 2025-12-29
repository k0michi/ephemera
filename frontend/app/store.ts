import { createStoreContext, Store } from "lib/store";

import Crypto, { type KeyPair } from '@ephemera/shared/lib/crypto.js';
import Client from '@ephemera/shared/lib/client.js';
import type { PostSignal } from "@ephemera/shared/api/api";

export class EphemeraStore extends Store {
  private _keyPair: KeyPair | null = null;

  constructor() {
    super();
  }

  get keyPair(): KeyPair | null {
    return this._keyPair;
  }

  checkLocalStorage() {
    if (!globalThis.localStorage) {
      throw new Error("localStorage is not available");
    }
  }

  revokeKeyPair() {
    this._keyPair = null;

    this.checkLocalStorage();

    localStorage.removeItem('ephemera_publicKey');
    localStorage.removeItem('ephemera_privateKey');
    this.notifyListeners();
  }

  prepareKeyPair() {
    if (this._keyPair) {
      return;
    }

    this.checkLocalStorage();

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
}

export const EphemeraStoreContext = createStoreContext(EphemeraStore);