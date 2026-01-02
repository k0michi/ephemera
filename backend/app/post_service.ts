import type { CreatePostSignalFooter, CreatePostSignal, Version, DeletePostSignal, Signal } from "@ephemera/shared/api/api.js";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto.js";
import Hex from "@ephemera/shared/lib/hex.js";
import type Config from "./config.js";
import NullableHelper from "@ephemera/shared/lib/nullable_helper.js";
import { ApiError } from "./api_error.js";
import { createPostSignalFooterSchema } from "@ephemera/shared/api/api_schema.js";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { posts } from "./db/schema.js";
import { and, desc, eq, lt } from "drizzle-orm";
import Base37 from "@ephemera/shared/lib/base37.js";
import Crypto from "@ephemera/shared/lib/crypto.js";

export interface IPostService {
  create(signal: CreatePostSignal): Promise<void>;

  validate<T extends Signal>(signal: T): Promise<[boolean, string?]>;

  find(options: PostFindOptions): Promise<PostFindResult>;

  delete(signal: DeletePostSignal): Promise<void>;
}

export interface PostFindOptions {
  limit: number;
  cursor: string | null;
  author: string | null;
}

export interface PostFindResult {
  posts: CreatePostSignal[];
  nextCursor: string | null;
}

export abstract class PostServiceBase implements IPostService {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async create(signal: CreatePostSignal): Promise<void> {
    const validation = await this.validate(signal);

    if (!validation[0]) {
      throw new ApiError(validation[1] || 'Invalid post signal', 400);
    }

    await this.createImpl(signal);
  }

  abstract createImpl(signal: CreatePostSignal): Promise<void>;

  async validate<T extends Signal>(signal: T): Promise<[boolean, string?]> {
    const verified = await SignalCrypto.verify(signal);

    if (!verified) {
      return [false, 'Invalid signature'];
    }

    if (signal[0][1][0] !== this.config.host) {
      return [false, 'Host mismatch'];
    }

    const now = Date.now();
    const timestamp = signal[0][1][2];

    if (Math.abs(now - timestamp) > this.config.allowedTimeSkewMillis) {
      return [false, 'Timestamp out of range'];
    }

    return [true];
  }

  abstract find(options: PostFindOptions): Promise<PostFindResult>;

  abstract delete(signal: DeletePostSignal): Promise<void>;
}

export default class PostService extends PostServiceBase {
  private database: MySql2Database;

  constructor(config: Config, database: MySql2Database) {
    super(config);
    this.database = database;
  }

  async createImpl(signal: CreatePostSignal) {
    const digest = await SignalCrypto.digest(signal[0]);

    try {
      await this.database.insert(posts).values({
        id: Hex.fromUint8Array(digest),
        version: signal[0][0],
        host: signal[0][1][0],
        author: signal[0][1][1],
        content: signal[0][2],
        footer: signal[0][3],
        signature: signal[1],
        createdAt: signal[0][1][2],
      });
    } catch (e: any) {
      if (e?.cause?.code === 'ER_DUP_ENTRY') {
        throw new ApiError('Post already exists', 409);
      }

      console.error('Error saving post:', e);
      throw new ApiError('Failed to save post', 500);
    }
  }

  static unwrapVersion(version: number): Version {
    if (version === 0) {
      return 0;
    } else {
      throw new Error(`Unsupported version: ${version}`);
    }
  }

  async find(options: PostFindOptions): Promise<PostFindResult> {
    const cursorNum = options?.cursor ? parseInt(options.cursor) : Number.MAX_SAFE_INTEGER;

    if (isNaN(cursorNum) || cursorNum < 0) {
      throw new ApiError('Invalid cursor', 400);
    }

    if (options.limit < 1) {
      throw new ApiError('Limit must be at least 1', 400);
    }

    if (options.author !== null) {
      if (!Base37.isValid(options.author)) {
        throw new ApiError('Invalid author format', 400);
      }

      const bytes = Base37.toUint8Array(options.author);

      if (!Crypto.isValidPublicKey(bytes)) {
        throw new ApiError('Invalid author public key', 400);
      }

      options.author = Base37.normalize(options.author);
    }

    const kMaxLimit = 128;
    options.limit = Math.min(options.limit, kMaxLimit);

    const cond = options.author !== null
      ? and(lt(posts.seq, cursorNum), eq(posts.author, options.author))
      : lt(posts.seq, cursorNum);

    const dbSignals = await this.database.select().from(posts)
      .where(cond)
      .orderBy(desc(posts.seq))
      .limit(options.limit + 1);

    const signals = dbSignals.map((post) => {
      return [
        [
          PostService.unwrapVersion(NullableHelper.unwrap(post.version)),
          [
            NullableHelper.unwrap(post.host),
            NullableHelper.unwrap(post.author),
            NullableHelper.unwrap(Number(post.createdAt)),
            "create_post",
          ],
          NullableHelper.unwrap(post.content),
          NullableHelper.unwrap(createPostSignalFooterSchema.parse(JSON.parse(post.footer as string))),
        ],
        NullableHelper.unwrap(post.signature),
      ] satisfies CreatePostSignal;
    });

    let nextCursor: string | null = null;

    if (dbSignals.length > options.limit) {
      // There is a next page
      const lastPost = NullableHelper.unwrap(dbSignals.at(-2));
      nextCursor = String(NullableHelper.unwrap(lastPost.seq));
      signals.pop();
    }

    const result: PostFindResult = {
      posts: signals,
      nextCursor: nextCursor,
    };

    return result;
  }

  async delete(signal: DeletePostSignal): Promise<void> {
    const validation = await this.validate(signal);

    if (!validation[0]) {
      throw new ApiError(validation[1] || 'Invalid delete signal', 400);
    }

    const postId = signal[0][2][0];

    const deleteResult = await this.database.delete(posts)
      .where(and(eq(posts.id, postId), eq(posts.author, signal[0][1][1])))
      .execute();

    if (deleteResult[0].affectedRows === 0) {
      throw new ApiError('Post not found', 404);
    }
  }
}