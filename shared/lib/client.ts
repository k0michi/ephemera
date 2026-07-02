import type { ApiRequest, ApiResponse, Attachment, CreatePostSignal, CreatePostSignalPayload, DeletePostRequest, DeletePostSignal, DeletePostSignalPayload, GetIdentityRequest, GetPostsRequest, GetPostsResponse, PeerManifest, Permission, Version } from "../api/api.js";
import { apiResponseSchema, getIdentityResponseSchema, getPeerResponseSchema, getPostResponseSchema, getPostsResponseSchema, getRemoteServersResponseSchema } from "../api/api_schema.js";
import Base37 from "./base37.js";
import type { KeyPair } from "./crypto.js";
import Crypto from "./crypto.js";
import Hex from "./hex.js";
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

  static async postForm(path: string, formData: FormData, options: RequestInit = {}): Promise<ApiResponse> {
    return this.fetch(path, {
      method: "POST",
      body: formData,
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

export interface ClientOptions {
  /**
   * The host of the local server
   */
  host: string;
  baseUrl?: string;
}

export default class Client {
  /**
   * e.g. "example.com". Does not include scheme (http/https) or path.
   */
  _host: string;
  _version: Version = 0;
  _baseUrl: string | null;

  constructor(options: ClientOptions) {
    this._host = options.host;
    this._baseUrl = options.baseUrl ?? null;
  }

  get host(): string {
    return this._host;
  }

  /**
   * Sends a post to the server.
   * 
   * @throws Error if the request fails or the post is invalid.
   */
  async sendPost(keyPair: KeyPair, post: string, attachments: File[] = []): Promise<void> {
    const validationResult = PostUtil.validate(post);

    if (!validationResult[0]) {
      throw new Error(`Post validation failed: ${validationResult[1]}`);
    }

    const publicKeyBase37 = Base37.fromUint8Array(keyPair.publicKey);

    const footers: Attachment[] = [];

    for (const file of attachments) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const digest = await Crypto.digest(bytes);
      const digestHex = Hex.fromUint8Array(digest);

      footers.push(['attachment', file.type, digestHex]);
    }

    const payload = [
      this._version,
      [this._host, publicKeyBase37, Date.now(), "create_post"],
      post,
      footers
    ] satisfies CreatePostSignalPayload;
    const signed: CreatePostSignal = await SignalCrypto.sign(payload, keyPair.privateKey);

    const formData = new FormData();
    formData.append("post", JSON.stringify(signed));

    for (const attachment of attachments) {
      formData.append("attachments", attachment);
    }

    const response = await Fetcher.postForm(this.buildLocalUrl(`/api/v1/post`), formData);
  }

  async fetchPosts(options: {
    cursor: string | null;
    limit?: number;
    author?: string | undefined;
  }): Promise<GetPostsResponse> {
    const response = await Fetcher.get(this.buildLocalUrl(`/api/v1/posts`), {
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

  async deletePost(keyPair: KeyPair, postId: string): Promise<void> {
    const payload: DeletePostSignalPayload = [
      this._version,
      [this._host, Base37.fromUint8Array(keyPair.publicKey), Date.now(), "delete_post"],
      [
        postId
      ],
      []
    ];
    const signed: DeletePostSignal = await SignalCrypto.sign(payload, keyPair.privateKey);

    const response = await Fetcher.delete(this.buildLocalUrl(`/api/v1/post`), {
      post: signed
    } satisfies DeletePostRequest);
  }

  getAttachmentUrl(hash: string, host: string): string {
    if (host !== this._host) {
      return `https://${host}/api/v1/attachments/${hash}`;
    }

    return this.buildLocalUrl(`/api/v1/attachments/${hash}`);
  }

  async getLocalServer(): Promise<PeerManifest> {
    const response = await Fetcher.get(this.buildLocalUrl(`/api/v1/peer`));

    let parsed;

    try {
      parsed = getPeerResponseSchema.parse(response);
    } catch (e) {
      throw new Error("Invalid response");
    }

    return parsed;
  }

  async getRemoteServers(): Promise<PeerManifest[]> {
    const response = await Fetcher.get(this.buildLocalUrl(`/api/v1/remote-servers`));
    let parsed;

    try {
      parsed = getRemoteServersResponseSchema.parse(response);
    } catch (e) {
      throw new Error("Invalid response");
    }

    return parsed.servers;
  }

  async getPost(postId: string): Promise<CreatePostSignal> {
    const response = await Fetcher.get(this.buildLocalUrl(`/api/v1/posts/${postId}`));
    let parsed;

    try {
      parsed = getPostResponseSchema.parse(response);
    } catch (e) {
      throw new Error("Invalid response");
    }

    return parsed.post;
  }

  async getIdentityPermissions(keyPair: KeyPair): Promise<Set<Permission>> {
    const response = await Fetcher.post(this.buildLocalUrl(`/api/v1/identity`), {
      signal: await SignalCrypto.sign([this._version, [this._host, Base37.fromUint8Array(keyPair.publicKey), Date.now(), "get_identity"], [], []], keyPair.privateKey)
    } satisfies GetIdentityRequest);
    let parsed;

    try {
      parsed = getIdentityResponseSchema.parse(response);
    } catch (e) {
      throw new Error("Invalid response");
    }

    return new Set(parsed.permissions);
  }

  buildLocalUrl(path: string): string {
    if (this._baseUrl !== null) {
      return `${this._baseUrl}${path}`;
    }

    return path;
  }
}