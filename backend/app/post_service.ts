import { LessThan, Repository } from "typeorm";
import { Post } from "./entity/post.js";
import type { CreatePostSignalFooter, PostSignal, Version } from "@ephemera/shared/api/api.js";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto.js";
import Hex from "@ephemera/shared/lib/hex.js";
import type Config from "./config.js";
import NullableHelper from "@ephemera/shared/lib/nullable_helper.js";
import { ApiError } from "./api_error.js";
import { createPostSignalFooterSchema } from "@ephemera/shared/api/api_schema.js";

export interface IPostService {
  create(signal: PostSignal): Promise<void>;

  validate(signal: PostSignal): Promise<[boolean, string?]>;

  find(options: PostFindOptions): Promise<PostFindResult>;
}

export interface PostFindOptions {
  limit: number;
  cursor: string | null;
}

export interface PostFindResult {
  posts: PostSignal[];
  nextCursor: string | null;
}

export abstract class PostServiceBase implements IPostService {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async create(signal: PostSignal): Promise<void> {
    const validation = await this.validate(signal);

    if (!validation[0]) {
      throw new ApiError(validation[1] || 'Invalid post signal', 400);
    }

    await this.createImpl(signal);
  }

  abstract createImpl(signal: PostSignal): Promise<void>;

  async validate(signal: PostSignal): Promise<[boolean, string?]> {
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
}

export default class PostService extends PostServiceBase {
  private postRepo: Repository<Post>;

  constructor(config: Config, postRepo: Repository<Post>) {
    super(config);
    this.postRepo = postRepo;
  }

  async createImpl(signal: PostSignal) {
    const post = new Post();
    const digest = await SignalCrypto.digest(signal[0]);
    post.id = Hex.fromUint8Array(digest);
    post.version = signal[0][0];
    post.host = signal[0][1][0];
    post.author = signal[0][1][1];
    post.content = signal[0][2];
    post.footer = signal[0][3];
    post.signature = signal[1];
    post.createdAt = String(signal[0][1][2]);

    try {
      await this.postRepo.insert(post);
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY') {
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
    const cursorNum = options?.cursor ? Number(options.cursor) : Number.MAX_SAFE_INTEGER;

    if (options.limit < 1) {
      throw new ApiError('Limit must be at least 1', 400);
    }

    const kMaxLimit = 128;
    options.limit = Math.min(options.limit, kMaxLimit);

    let dbSignals = await this.postRepo.find({
      order: {
        seq: "DESC",
      },
      take: options.limit + 1,
      where: {
        seq: LessThan(cursorNum),
      },
    });

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
          NullableHelper.unwrap(createPostSignalFooterSchema.parse(post.footer)),
        ],
        NullableHelper.unwrap(post.signature),
      ] satisfies PostSignal;
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
}