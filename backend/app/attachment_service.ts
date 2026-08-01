import AttachmentUtil, { type AttachmentCategory, type AttachmentVariant } from '@ephemera/shared/lib/attachment_util.js';
import Hex from '@ephemera/shared/lib/hex.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import SymbolHelper from '@ephemera/shared/lib/symbol_helper.js';
import { eq, isNull } from 'drizzle-orm';
import { fileTypeFromFile } from 'file-type';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';
import mime from 'mime-types';
import path from 'path';
import sharp from 'sharp';

import { ApiError } from './api_error.js';
import type Config from './config.js';
import type { PooledDatabase, Transaction } from './database.js';
import { attachments, postAttachments } from './db/schema.js';
import FSHelper from './fs_helper.js';
import { KeyedRWLock } from './keyed_rw_lock.js';
import SafeFS from './safe_fs.js';
import type { ITranscoderService } from './transcoder_service.js';

export interface AttachmentType {
  type: string;
  ext: string;
}

export interface IAttachmentService {
  get attachmentsDir(): string;

  copyFrom(srcFile: string, tx: Transaction): Promise<string>;

  open(hash: string): Promise<fs.FileHandle>;

  openVariant(hash: string, variant: AttachmentVariant, part?: string): Promise<fs.FileHandle>;

  getType(hash: string): Promise<AttachmentType>;

  getVariantType(hash: string, variant: AttachmentVariant, part?: string): Promise<AttachmentType>;

  linkPost(postId: string, attachmentIds: string[], tx: Transaction): Promise<void>;

  /**
   * Get the file path for a given attachment hash. This does not check if the file exists.
   */
  getFilePath(hash: string): string;

  removeOrphans(): Promise<string[]>;

  removeUnlinkedFiles(): Promise<string[]>;
}

export class AttachmentService implements IAttachmentService {
  private config: Config;
  private database: PooledDatabase;
  private rwLock = new KeyedRWLock();
  private static _kMaxAttachmentSize: number = 64 * 1024 * 1024; // 64 MB
  private static _kMaxAttachmentWidth: number = 4096; // 4096 pixels
  private static _kAllowedAttachmentTypes: Set<string> = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]);
  private static _kAllowedVideoCodecs: Set<string> = new Set([
    'h264',
    'vp8',
    'vp9',
    'av1'
  ]);

  private transcoderService: ITranscoderService;

  constructor(config: Config, database: PooledDatabase, transcoderService: ITranscoderService) {
    this.config = config;
    this.database = database;
    this.transcoderService = transcoderService;
  }

  get attachmentsDir(): string {
    return this.config.attachmentsDir;
  }

  get variantsDir(): string {
    return this.config.variantsDir;
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

      if (codec === undefined) {
        throw new ApiError('Could not determine video codec', 400);
      }

      if (!AttachmentService._kAllowedVideoCodecs.has(codec)) {
        throw new ApiError(`Video codec ${codec} is not allowed`, 400);
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

    this.transcoderService.encodeAll(hash, AttachmentUtil.getKindFromMimeType(detected.mime))
      .catch((e) => {
        console.error(`Failed to encode variants for ${hash}:`, e);
      });

    return hash;
  }

  validateAttachment(hash: string) {
    if (!Hex.isValid(hash) || hash.length !== 64) {
      throw new ApiError('Invalid attachment hash', 400);
    }
  }

  async open(hash: string): Promise<fs.FileHandle> {
    this.validateAttachment(hash);

    const lock = await this.rwLock.acquireRead(hash);

    try {
      const handle = await SafeFS.open(this.attachmentsDir, hash);
      const realAsyncDispose = handle[SymbolHelper.asyncDispose];
      const disposableHandle = handle;

      disposableHandle[SymbolHelper.asyncDispose] = async () => {
        try {
          await realAsyncDispose.call(handle);
        } finally {
          lock[SymbolHelper.dispose]();
        }
      };

      return disposableHandle;
    } catch (e) {
      lock[SymbolHelper.dispose]();
      throw new ApiError('Attachment not found', 404);
    }
  }

  private async getAttachmentKind(hash: string): Promise<AttachmentCategory> {
    const [record] = await this.database
      .select({ type: attachments.type })
      .from(attachments)
      .where(eq(attachments.id, hash))
      .limit(1)
      .execute();

    if (!record) {
      throw new ApiError('Attachment not found', 404);
    }

    return AttachmentUtil.getKindFromMimeType(NullableHelper.unwrap(record.type));
  }

  private validateVariant(kind: AttachmentCategory, variant: AttachmentVariant): void {
    if (!AttachmentUtil.isVariantInCategory(kind, variant)) {
      throw new ApiError('Invalid variant requested', 400);
    }
  }

  private resolveVariantPath(kind: AttachmentCategory, hash: string, variant: AttachmentVariant, part?: string): string {
    if (variant === 'index') {
      return path.join(hash, 'index.m3u8');
    }

    if (kind === 'image') {
      return path.join(hash, `${variant}.webp`);
    }

    if (part === undefined) {
      throw new ApiError('Invalid variant for video', 400);
    }

    return path.join(hash, variant, part);
  }

  async openVariant(hash: string, variant: AttachmentVariant, part?: string): Promise<fs.FileHandle> {
    this.validateAttachment(hash);

    const kSafePart = /^[\w.-]+\.(m3u8|ts|aac)$/;

    if (part !== undefined && !kSafePart.test(part)) {
      throw new ApiError('Invalid part requested', 400);
    }

    const kind = await this.getAttachmentKind(hash);
    this.validateVariant(kind, variant);
    const variantPath = this.resolveVariantPath(kind, hash, variant, part);

    try {
      return await SafeFS.open(this.variantsDir, variantPath);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw e;
      }
    }

    await this.transcoderService.encodeVariant(hash, kind, variant);

    try {
      return await SafeFS.open(this.variantsDir, variantPath);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new ApiError('Attachment variant or part not found', 404);
      }

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

  async getVariantType(hash: string, variant: AttachmentVariant, part?: string): Promise<AttachmentType> {
    const kind = await this.getAttachmentKind(hash);

    if (kind === 'image') {
      return { type: 'image/webp', ext: 'webp' };
    }

    if (part === undefined) {
      return { type: 'application/vnd.apple.mpegurl', ext: 'm3u8' };
    }

    const ext = path.extname(part).slice(1);
    const type = AttachmentUtil.getVariantPartMimeType(ext);

    if (!type) {
      throw new ApiError('Unsupported part extension', 400);
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
    return path.join(this.attachmentsDir, hash);
  }

  private async removeVariantCache(hash: string): Promise<void> {
    await fs.rm(path.join(this.variantsDir, hash), { recursive: true, force: true });
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

        await this.removeVariantCache(orphan.id);

        console.log(`Successfully cleaned up: ${orphan.id}`);
        removed.push(orphan.id);
      } catch (e) {
        console.log(`Failed to clean up orphaned attachment ${orphan.id}:`, e);
        continue;
      }
    }

    return removed;
  }

  async removeUnlinkedFiles(): Promise<string[]> {
    let files: string[] = [];

    try {
      files = await fs.readdir(this.attachmentsDir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw e;
      }
    }

    const removed = [];

    for (const fileId of files) {
      try {
        using lock = await this.rwLock.acquireWrite(fileId, 0);

        const [record] = await this.database
          .select({ id: attachments.id })
          .from(attachments)
          .where(eq(attachments.id, fileId));

        if (!record) {
          await fs.unlink(this.getFilePath(fileId));
          await this.removeVariantCache(fileId);

          console.log(`Successfully removed unlinked file: ${fileId}`);
          removed.push(fileId);
        }
      } catch (e) {
        console.log(`Failed to remove unlinked file ${fileId}:`, e);
        continue;
      }
    }

    return removed;
  }
}