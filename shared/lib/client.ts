import type { CreatePostSignalPayload, GetPostsRequest, GetPostsResponse, PostRequest, PostResponse, PostSignal, Version } from "../api/api.js";
import Base37 from "./base37.js";
import type { KeyPair } from "./crypto.js";
import Hex from "./hex.js";
import NullableHelper from "./nullable_helper.js";
import PostUtil from "./post_util.js";
import SignalCrypto from "./signal_crypto.js";

export default class Client {
  /**
   * e.g. "example.com". Does not include scheme (http/https) or path.
   */
  _host: string;
  _keyPair: KeyPair | null;
  _version: Version = 0;

  constructor(host: string, keyPair: KeyPair | null) {
    this._host = host;
    this._keyPair = keyPair;
  }

  get host(): string {
    return this._host;
  }

  get keyPair(): KeyPair | null {
    return this._keyPair;
  }

  /**
   * Sends a post to the server.
   * 
   * @throws Error if the request fails or the post is invalid.
   */
  async sendPost(post: string): Promise<void> {
    if (!this._keyPair) {
      throw new Error("Key pair does not exist");
    }

    const validationResult = PostUtil.validate(post);

    if (!validationResult[0]) {
      throw new Error(`Post validation failed: ${validationResult[1]}`);
    }

    const publicKeyBase37 = Base37.fromUint8Array(this._keyPair.publicKey);
    const payload = [
      this._version,
      [this._host, publicKeyBase37, Date.now(), "create_post"],
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

  async fetchPosts(options: {
    cursor: string | null;
    limit?: number;
  }): Promise<GetPostsResponse> {
    const params = new URLSearchParams({
      ...(options.limit !== undefined ? { limit: String(options.limit) } : {}),
      ...(options.cursor !== null ? { cursor: options.cursor } : {}),
    } satisfies GetPostsRequest);

    const response = await fetch(`/api/v1/posts?${params.toString()}`, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status} ${response.statusText}`);
    }

    const responseData = (await response.json()) as GetPostsResponse;

    if (responseData.error) {
      throw new Error(`Failed to fetch posts: ${responseData.error}`);
    }

    return responseData;
  }
}