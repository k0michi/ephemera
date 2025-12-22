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
}

export const EphemeraStoreContext = createStoreContext(EphemeraStore);