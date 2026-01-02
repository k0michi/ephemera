import type { ApiRequest, ApiResponse, CreatePostSignalPayload, GetPostsRequest, GetPostsResponse, PostRequest, CreatePostSignal, Version, DeletePostRequest, DeletePostSignal, DeletePostSignalPayload } from "../api/api.js";
import { apiResponseSchema, getPostsResponseSchema } from "../api/api_schema.js";
import Base37 from "./base37.js";
import type { KeyPair } from "./crypto.js";
import PostUtil from "./post_util.js";
import SignalCrypto from "./signal_crypto.js";

export class FetchError extends Error {
}

export class Fetcher {
  static async fetch(input: RequestInfo, init?: RequestInit): Promise<ApiResponse> {
    const response = await fetch(input, init);

    let json: any;

    try {
      json = await response.json();
    } catch (e) {
      throw new FetchError(`Failed to parse JSON response from ${input.toString()}`);
    }

    if (!response.ok) {
      const error = json.error;

      if (typeof error === "string") {
        throw new FetchError(`Request to ${input.toString()} failed: ${error}`);
      } else {
        throw new FetchError(`Request to ${input.toString()} failed`);
      }
    }

    let parsed;

    try {
      parsed = apiResponseSchema.loose().parse(json);
    } catch (e) {
      throw new FetchError(`Invalid response format from ${input.toString()}`);
    }

    return parsed as ApiResponse;
  }

  static async get(path: string, params: Record<string, string> = {}, options: RequestInit = {}): Promise<ApiResponse> {
    const urlParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      urlParams.append(key, value);
    }

    return this.fetch(`${path}?${urlParams.toString()}`, {
      method: "GET",
      ...options,
    });
  }

  static async post<T extends ApiRequest>(path: string, body: T, options: RequestInit = {}): Promise<ApiResponse> {
    return this.fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      ...options,
    });
  }

  static async delete<T extends ApiRequest>(path: string, body: T, options: RequestInit = {}): Promise<ApiResponse> {
    return this.fetch(path, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      ...options,
    });
  }
}

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
    const signed: CreatePostSignal = await SignalCrypto.sign(payload, this._keyPair.privateKey);

    const response = await Fetcher.post(`/api/v1/post`, {
      post: signed
    } satisfies PostRequest);
  }

  async fetchPosts(options: {
    cursor: string | null;
    limit?: number;
    author?: string | undefined;
  }): Promise<GetPostsResponse> {
    const response = await Fetcher.get(`/api/v1/posts`, {
      ...(options.limit !== undefined ? { limit: String(options.limit) } : {}),
      ...(options.cursor !== null ? { cursor: options.cursor } : {}),
      ...(options.author !== undefined ? { author: options.author } : {}),
    } satisfies GetPostsRequest);

    let parsed;

    try {
      parsed = getPostsResponseSchema.parse(response);
    } catch (e) {
      throw new FetchError("Invalid response format for fetchPosts");
    }

    return parsed as GetPostsResponse;
  }

  async deletePost(postId: string): Promise<void> {
    if (!this._keyPair) {
      throw new Error("Key pair does not exist");
    }

    const payload: DeletePostSignalPayload = [
      this._version,
      [this._host, Base37.fromUint8Array(this._keyPair.publicKey), Date.now(), "delete_post"],
      [
        postId
      ],
      []
    ];
    const signed: DeletePostSignal = await SignalCrypto.sign(payload, this._keyPair.privateKey);

    const response = await Fetcher.delete(`/api/v1/post`, {
      post: signed
    } satisfies DeletePostRequest);
  }
}