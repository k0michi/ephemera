import type { CreatePostSignalPayload, PostRequest, PostResponse, PostSignal } from "../../shared/api/api";
import type { KeyPair } from "./crypto";
import Hex from "./hex";
import SignalCrypto from "./signal_crypto";

export class Client {
  /**
   * e.g. "example.com". Does not include scheme (http/https) or path.
   */
  _host: string;
  _keyPair: KeyPair;

  constructor(host: string, keyPair: KeyPair) {
    this._host = host;
    this._keyPair = keyPair;
  }

  get host(): string {
    return this._host;
  }

  get keyPair(): KeyPair {
    return this._keyPair;
  }

  /**
   * Sends a post to the server.
   * 
   * @throws Error if the request fails.
   */
  async sendPost(post: string): Promise<void> {
    const publicKeyHex = Hex.fromUint8Array(this._keyPair.publicKey);
    const payload = [
      0,
      [this._host, publicKeyHex, new Date().toISOString(), "create_post"],
      post,
      []
    ] satisfies CreatePostSignalPayload;
    const signed: PostSignal = await SignalCrypto.sign(payload, this._keyPair.privateKey);
    const response = await fetch(`/api/v1/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        post: signed
      } satisfies PostRequest
      )
    });

    if (!response.ok) {
      throw new Error(`Failed to send post: ${response.status} ${response.statusText}`);
    }

    const responseData = (await response.json()) as PostResponse;

    if (responseData.error) {
      throw new Error(`Failed to send post: ${responseData.error}`);
    }

    return;
  }
}