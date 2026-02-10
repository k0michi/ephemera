import 'core-js/modules/es.symbol.dispose';
import 'core-js/modules/es.symbol.async-dispose';

export class DisposableURL implements Disposable {
  private _url: string | null = null;

  constructor(obj: Blob | MediaSource) {
    this._url = URL.createObjectURL(obj);
  }

  get url(): string {
    if (this._url === null) {
      throw new Error("URL has been revoked or not initialized.");
    }

    return this._url;
  }

  [Symbol.dispose]() {
    if (this._url !== null) {
      URL.revokeObjectURL(this._url);
      this._url = null;
    }
  }
}