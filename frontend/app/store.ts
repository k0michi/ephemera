import { createStoreContext, Store } from "lib/store";

import Crypto, { type KeyPair } from "./crypto";

export class EphemeraStore extends Store {
  private _keyPair: KeyPair | null = null;

  constructor() {
    super();
  }

  get keyPair(): KeyPair | null {
    return this._keyPair;
  }

  revokeKeyPair() {
    this._keyPair = null;

    if (globalThis.localStorage) {
      localStorage.removeItem('ephemera_publicKey');
      localStorage.removeItem('ephemera_privateKey');
    }

    this.notifyListeners();
  }

  prepareKeyPair() {
    if (this._keyPair) {
      return;
    }

    // Check the existence of localStorage
    if (globalThis.localStorage) {
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
    }

    const keyPair = Crypto.generateKeyPair();
    this._keyPair = keyPair;

    localStorage.setItem('ephemera_publicKey', JSON.stringify(Array.from(keyPair.publicKey)));
    localStorage.setItem('ephemera_privateKey', JSON.stringify(Array.from(keyPair.privateKey)));
    this.notifyListeners();
  }
}

export const EphemeraStoreContext = createStoreContext(EphemeraStore);