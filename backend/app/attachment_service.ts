import fs from 'fs/promises';
import type Config from './config.js';
import crypto from 'crypto';
import path from 'path';
import { attachments, postAttachments } from './db/schema.js';
import { eq, inArray, isNull } from 'drizzle-orm';
import ArrayHelper from '@ephemera/shared/lib/array_helper.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import { ApiError } from './api_error.js';
import Hex from '@ephemera/shared/lib/hex.js';
import { fileTypeFromFile } from 'file-type';
import mime from 'mime-types';
import sharp from 'sharp';
import FSHelper from './fs_helper.js';
import ffmpeg from 'fluent-ffmpeg';
import type { PooledDatabase, Transaction } from './database.js';
import { KeyedRWLock } from './keyed_rw_lock.js';

export interface AttachmentType {
  type: string;
  ext: string;
}

export interface IAttachmentService {
  get attachmentsDir(): string;

  copyFrom(srcFile: string, tx: Transaction): Promise<string>;

  open(hash: string): Promise<fs.FileHandle>;

  getType(hash: string): Promise<AttachmentType>;

  linkPost(postId: string, attachmentIds: string[], tx: Transaction): Promise<void>;

  getFilePath(hash: string): string;

  removeOrphans(): Promise<string[]>;

  removeUnlinkedFiles(): Promise<string[]>;
}

export class AttachmentService implements IAttachmentService {
  private config: Config;
  private database: PooledDatabase;
  private rwLock = new KeyedRWLock();
  private static _kMaxAttachmentSize: number = 16 * 1024 * 1024; // 16 MB
  private static _kMaxAttachmentWidth: number = 4096; // 4096 pixels
  private static _kAllowedAttachmentTypes: Set<string> = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'video/mp4',
  ]);

  constructor(config: Config, database: PooledDatabase) {
    this.config = config;
    this.database = database;
  }

  get attachmentsDir(): string {
    return path.join(this.config.dataDir, 'attachments');
  }

  private ffprobe(filePath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  private async validateImage(srcFile: string): Promise<void> {
    try {
      const image = sharp(srcFile, { failOn: 'error', limitInputPixels: AttachmentService._kMaxAttachmentWidth ** 2 });
      const metadata = await image.metadata();

      if (metadata.width > AttachmentService._kMaxAttachmentWidth
        || metadata.height > AttachmentService._kMaxAttachmentWidth) {
        throw new ApiError('Attachment dimensions exceed maximum allowed size', 400);
      }

      await image.stats();
    } catch (e) {
      throw new ApiError('Attachment is not a valid image', 400);
    }
  }

  private async validateVideo(srcFile: string): Promise<void> {
    try {
      const metadata = await this.ffprobe(srcFile);

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');

      if (!videoStream) {
        throw new ApiError('Attachment does not contain a video stream', 400);
      }

      const width = videoStream.width;
      const height = videoStream.height;

      if (width === undefined || height === undefined) {
        throw new ApiError('Could not determine video dimensions', 400);
      }

      if (width > AttachmentService._kMaxAttachmentWidth
        || height > AttachmentService._kMaxAttachmentWidth) {
        throw new ApiError('Attachment dimensions exceed maximum allowed size', 400);
      }

      const codec = videoStream.codec_name;

      if (codec !== 'h264') {
        throw new ApiError('Only H.264 encoded videos are allowed', 400);
      }
    } catch (e) {
      if (e instanceof ApiError) {
        throw e;
      }

      throw new ApiError('Attachment is not a valid video', 400);
    }
  }

  async copyFrom(srcFile: string, tx: Transaction): Promise<string> {
    // Validation

    const size = await FSHelper.size(srcFile);

    if (size > AttachmentService._kMaxAttachmentSize) {
      throw new ApiError('Attachment size exceeds maximum allowed size', 400);
    }

    const detected = await fileTypeFromFile(srcFile);

    if (detected === undefined
      || !AttachmentService._kAllowedAttachmentTypes.has(detected.mime)) {
      throw new ApiError('Attachment type is not allowed', 400);
    }

    if (detected.mime.startsWith('image/')) {
      await this.validateImage(srcFile);
    } else if (detected.mime.startsWith('video/')) {
      await this.validateVideo(srcFile);
    }

    // Validation complete

    const hash = await FSHelper.digest(srcFile, 'sha256');
    const destFile = this.getFilePath(hash);

    using lock = await this.rwLock.acquireWrite(hash);

    await fs.mkdir(this.attachmentsDir, { recursive: true });
    await fs.copyFile(srcFile, destFile);

    await tx.insert(attachments).values({
      id: hash,
      type: detected.mime,
      size: size,
    }).onDuplicateKeyUpdate({ set: { id: hash } });

    return hash;
  }

  async open(hash: string): Promise<fs.FileHandle> {
    const lock = await this.rwLock.acquireRead(hash);

    try {
      const handle = await fs.open(this.getFilePath(hash), 'r');
      const realAsyncDispose = handle[Symbol.asyncDispose];
      const disposableHandle = handle;

      disposableHandle[Symbol.asyncDispose] = async () => {
        try {
          await realAsyncDispose.call(handle);
        } finally {
          lock[Symbol.dispose]();
        }
      };

      return disposableHandle;
    } catch (e) {
      lock[Symbol.dispose]();
      throw e;
    }
  }

  async getType(hash: string): Promise<AttachmentType> {
    // Read the attachment type from the database to prevent spoofing

    const result = await this.database
      .select({
        type: attachments.type,
      })
      .from(attachments)
      .where(eq(attachments.id, hash))
      .limit(1)
      .execute();

    if (result.length === 0) {
      throw new ApiError('Attachment not found', 404);
    }

    // return NullableHelper.unwrap(result[0]?.type);
    const type = NullableHelper.unwrap(result[0]?.type);
    const ext = mime.extension(type);

    if (!ext) {
      throw new ApiError('Could not determine file extension', 500);
    }

    return { type, ext };
  }

  async linkPost(postId: string, attachmentIds: string[], tx: Transaction): Promise<void> {
    const rows = attachmentIds.map((attachmentId) => ({
      postId: postId,
      attachmentId: attachmentId,
    }));

    if (rows.length > 0) {
      await tx.insert(postAttachments).values(rows).execute();
    }
  }

  getFilePath(hash: string): string {
    if (!Hex.isValid(hash) || hash.length !== 64) {
      throw new ApiError('Invalid attachment hash', 400);
    }

    return path.join(this.attachmentsDir, hash);
  }

  async removeOrphans(): Promise<string[]> {
    const candidates = await this.database
      .select({
        id: attachments.id,
      })
      .from(attachments)
      .leftJoin(postAttachments, eq(attachments.id, postAttachments.attachmentId))
      .where(isNull(postAttachments.postId));

    const removed = [];

    for (const orphan of candidates) {
      try {
        using lock = await this.rwLock.acquireWrite(orphan.id);

        const stillOrphan = await this.database
          .select({ id: postAttachments.attachmentId })
          .from(postAttachments)
          .where(eq(postAttachments.attachmentId, orphan.id))
          .limit(1);

        if (stillOrphan.length > 0) {
          continue;
        }

        await this.database.delete(attachments).where(eq(attachments.id, orphan.id));

        try {
          await fs.unlink(this.getFilePath(orphan.id));
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
            throw e;
          }
        }

        console.log(`Successfully cleaned up: ${orphan.id}`);
        removed.push(orphan.id);
      } catch (e) {
        continue;
      }
    }

    return removed;
  }

  async removeUnlinkedFiles(): Promise<string[]> {
    const files = await fs.readdir(this.attachmentsDir);

    const removed = [];

    for (const fileId of files) {
      using lock = await this.rwLock.acquireWrite(fileId, 0);

      const [record] = await this.database
        .select({ id: attachments.id })
        .from(attachments)
        .where(eq(attachments.id, fileId));

      if (!record) {
        await fs.unlink(this.getFilePath(fileId));

        console.log(`Successfully removed unlinked file: ${fileId}`);
        removed.push(fileId);
      }
    }

    return removed;
  }
}