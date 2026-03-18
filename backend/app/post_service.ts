import type { CreatePostSignalFooter, CreatePostSignal, Version, DeletePostSignal, Signal } from "@ephemera/shared/api/api.js";
import SignalCrypto from "@ephemera/shared/lib/signal_crypto.js";
import Hex from "@ephemera/shared/lib/hex.js";
import type Config from "./config.js";
import NullableHelper from "@ephemera/shared/lib/nullable_helper.js";
import { ApiError } from "./api_error.js";
import { createPostSignalFooterSchema } from "@ephemera/shared/api/api_schema.js";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { posts, remotePosts } from "./db/schema.js";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import Base37 from "@ephemera/shared/lib/base37.js";
import Crypto from "@ephemera/shared/lib/crypto.js";
import type { IAttachmentService } from "./attachment_service.js";
import ArrayHelper from "@ephemera/shared/lib/array_helper.js";
import FSHelper from "./fs_helper.js";
import type { IPeerService } from "./peer_service.js";
import { PostCursorUtil, type PostCursor } from "@ephemera/shared/lib/post_cursor_util.js";
import DateTimeUtil from "@ephemera/shared/lib/date_time_util.js";
import { Temporal } from "@js-temporal/polyfill";
import { unionAll } from "drizzle-orm/mysql-core";

export interface IPostService {
  create(signal: CreatePostSignal, attachmentPaths: string[]): Promise<void>;

  validate<T extends Signal>(signal: T): Promise<[boolean, string?]>;

  find(options: PostFindOptions): Promise<PostFindResult>;

  delete(signal: DeletePostSignal): Promise<void>;
}

export type PostSource = 'local' | 'remote' | 'all';

export interface PostFindOptions {
  limit: number;
  cursor: string | null;
  author: string | null;
  source?: PostSource | null;
}

export interface PostFindResult {
  posts: CreatePostSignal[];
  nextCursor: string | null;
}

export abstract class PostServiceBase implements IPostService {
  protected config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  async create(signal: CreatePostSignal, attachmentPaths: string[]): Promise<void> {
    const validation = await this.validate(signal);

    if (!validation[0]) {
      throw new ApiError(validation[1] || 'Invalid post signal', 400);
    }

    await this.createImpl(signal, attachmentPaths);
  }

  abstract createImpl(signal: CreatePostSignal, attachmentPaths: string[]): Promise<void>;

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
  private attachmentService: IAttachmentService;
  private peerService: IPeerService;
  private static _kMaxAttachmentsPerPost: number = 4;

  constructor(config: Config, database: MySql2Database, attachmentService: IAttachmentService, peerService: IPeerService) {
    super(config);
    this.database = database;
    this.attachmentService = attachmentService;
    this.peerService = peerService;
  }

  async validateAttachmentCount(attachmentPaths: string[]): Promise<void> {
    if (attachmentPaths.length > PostService._kMaxAttachmentsPerPost) {
      throw new ApiError('Too many attachments', 400);
    }
  }

  async validateAttachmentDigests(signal: CreatePostSignal, attachmentPaths: string[]): Promise<void> {
    const expectedAttachments = signal[0][3]
      .filter((footer) => footer[0] === 'attachment')
      .map((footer) => footer[2]);

    const actualAttachments: string[] = [];

    for (const path of attachmentPaths) {
      actualAttachments.push(await FSHelper.digest(path, 'sha256'));
    }

    if (ArrayHelper.equals(expectedAttachments.sort(), actualAttachments.sort()) === false) {
      throw new ApiError('Missing or extra attachments', 400);
    }
  }

  async createImpl(signal: CreatePostSignal, attachmentPaths: string[]): Promise<void> {
    await this.validateAttachmentCount(attachmentPaths);
    await this.validateAttachmentDigests(signal, attachmentPaths);

    let insertedAt: string | null = null;
    const digest = await SignalCrypto.digest(signal[0]);
    const digestHex = Hex.fromUint8Array(digest);

    try {
      await this.database.transaction(async (tx) => {
        const attachmentIds: string[] = [];

        for (const path of attachmentPaths) {
          attachmentIds.push(await this.attachmentService.copyFrom(path, tx));
        }

        try {
          await tx.insert(posts).values({
            id: digestHex,
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

          throw e;
        }

        const row = await tx.select({ insertedAt: posts.insertedAt })
          .from(posts)
          .where(eq(posts.id, digestHex))
          .limit(1);
        insertedAt = row[0]?.insertedAt ?? null;

        await this.attachmentService.linkPost(
          digestHex,
          attachmentIds,
          tx
        );
      });
    } catch (e: any) {
      if (e instanceof ApiError) {
        throw e;
      }

      console.error('Error saving post:', e);
      throw new ApiError('Failed to save post', 500);
    }

    if (insertedAt !== null) {
      const temporal = DateTimeUtil.fromMySQLString(insertedAt);
      const timestamp = temporal.epochMilliseconds;

      const serverSigned = await SignalCrypto.signServer([
        0,
        [
          this.config.host,
          this.config.publicKey,
          timestamp,
          'relay',
        ],
        signal,
        [],
      ], Base37.toUint8Array(this.config.privateKey));

      await this.peerService.publish(serverSigned);
    } else {
      console.error(`Failed to retrieve insertedAt for post ${digestHex}`);
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
    let cursor: PostCursor | null = null;
    let cursorTimeMySQL: string | null = null;

    if (options.cursor) {
      try {
        cursor = PostCursorUtil.parse(options.cursor);
        cursorTimeMySQL = DateTimeUtil.toMySQLString(Temporal.Instant.from(cursor[0]));
      } catch (e) {
        throw new ApiError('Invalid cursor', 400);
      }
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
    options.source = options.source ?? 'all';

    const needLocal = options.source === 'local' || options.source === 'all';
    const needRemote = options.source === 'remote' || options.source === 'all';

    const localFilters = [];
    const remoteFilters = [];

    if (options.author !== null) {
      localFilters.push(eq(posts.author, options.author));
      remoteFilters.push(eq(remotePosts.author, options.author));
    }

    if (cursor !== null && cursorTimeMySQL !== null) {
      localFilters.push(sql`(${posts.insertedAt}, ${posts.id}) < (${cursorTimeMySQL}, ${cursor[1]})`);
      remoteFilters.push(sql`(${remotePosts.insertedAt}, ${remotePosts.id}) < (${cursorTimeMySQL}, ${cursor[1]})`);
    }

    const localCond = localFilters.length > 0 ? and(...localFilters) : undefined;
    const remoteCond = remoteFilters.length > 0 ? and(...remoteFilters) : undefined;

    const localQuery = this.database.select({
      id: posts.id,
      version: posts.version,
      host: posts.host,
      author: posts.author,
      content: posts.content,
      footer: posts.footer,
      signature: posts.signature,
      createdAt: posts.createdAt,
      insertedAt: posts.insertedAt,
    }).from(posts)
      .where(localCond)
      .orderBy(desc(posts.insertedAt), desc(posts.id))
      .limit(options.limit + 1);

    const remoteQuery = this.database.select({
      id: remotePosts.id,
      version: remotePosts.version,
      host: remotePosts.host,
      author: remotePosts.author,
      content: remotePosts.content,
      footer: remotePosts.footer,
      signature: remotePosts.signature,
      createdAt: remotePosts.createdAt,
      insertedAt: remotePosts.insertedAt,
    }).from(remotePosts)
      .where(remoteCond)
      .orderBy(desc(remotePosts.insertedAt), desc(remotePosts.id))
      .limit(options.limit + 1);

    let dbSignals: {
      id: string;
      version: number | null;
      host: string | null;
      author: string | null;
      content: string | null;
      footer: unknown;
      signature: string | null;
      createdAt: number | null;
      insertedAt: string | null;
    }[];

    if (needLocal && needRemote) {
      dbSignals = await this.database.select()
        .from(unionAll(localQuery, remoteQuery).as('combined'))
        .orderBy(desc(sql`insertedAt`), desc(sql`id`))
        .limit(options.limit + 1);

    } else if (needLocal) {
      dbSignals = await localQuery;
    } else if (needRemote) {
      dbSignals = await remoteQuery;
    } else {
      dbSignals = [];
    }

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

      const dbInsertedAt = NullableHelper.unwrap(lastPost.insertedAt);
      const dbID = NullableHelper.unwrap(lastPost.id);

      const isoInsertedAt = DateTimeUtil.fromMySQLString(dbInsertedAt);
      nextCursor = PostCursorUtil.stringify([isoInsertedAt.toString({ fractionalSecondDigits: 6 }), dbID]);

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

    await this.peerService.publish(await SignalCrypto.signServer([
      0,
      [
        this.config.host,
        this.config.publicKey,
        Date.now(),
        'relay',
      ],
      signal,
      [],
    ], Base37.toUint8Array(this.config.privateKey)));

    if (deleteResult[0].affectedRows === 0) {
      throw new ApiError('Post not found', 404);
    }
  }
}