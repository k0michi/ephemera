import fs from 'fs/promises';
import type Config from './config.js';
import type { MySql2Database } from 'drizzle-orm/mysql2';
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

export interface AttachmentType {
  type: string;
  ext: string;
}

export interface IAttachmentService {
  copyFrom(srcFile: string, tx: MySql2Database): Promise<string>;

  open(hash: string): Promise<fs.FileHandle>;

  getType(hash: string): Promise<AttachmentType>;

  linkPost(postId: string, attachmentIds: string[], tx: MySql2Database): Promise<void>;

  getFilePath(hash: string): string;

  removeOrphans(): Promise<void>;
}

export class AttachmentService implements IAttachmentService {
  private config: Config;
  private database: MySql2Database;
  private static _kMaxAttachmentSize: number = 16 * 1024 * 1024; // 16 MB
  private static _kMaxAttachmentWidth: number = 4096; // 4096 pixels
  private static _kAllowedAttachmentTypes: Set<string> = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
  ]);

  constructor(config: Config, database: MySql2Database) {
    this.config = config;
    this.database = database;
  }

  get attachmentsDir(): string {
    return path.join(this.config.dataDir, 'attachments');
  }

  async copyFrom(srcFile: string, tx: MySql2Database): Promise<string> {
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

    // Only images are allowed for now
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

    // Validation complete

    const hash = await FSHelper.digest(srcFile, 'sha256');
    const destFile = this.getFilePath(hash);

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
    const filePath = this.getFilePath(hash);
    try {
      return await fs.open(filePath, 'r');
    } catch (e) {
      throw new ApiError('Attachment not found', 404);
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

  async linkPost(postId: string, attachmentIds: string[], tx: MySql2Database): Promise<void> {
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

  async removeOrphans(): Promise<void> {
    const orphans = await this.database
      .select({
        id: attachments.id,
      })
      .from(attachments)
      .leftJoin(postAttachments, eq(attachments.id, postAttachments.attachmentId))
      .where(isNull(postAttachments.postId));

    console.log(`Found ${orphans.length} orphaned attachments.`);

    const deletedIds: string[] = [];

    for (const orphan of orphans) {
      try {
        await fs.unlink(this.getFilePath(orphan.id));
        console.log(`Deleted attachment file: ${orphan.id}`);
        deletedIds.push(orphan.id);
      } catch (e: any) {
        if (e.code === 'ENOENT') {
          deletedIds.push(orphan.id);
        } else {
          console.error(`Failed to delete attachment file ${orphan.id}:`, e);
        }
      }
    }

    if (deletedIds.length > 0) {
      await this.database
        .delete(attachments)
        .where(inArray(attachments.id, deletedIds))
        .execute();
    }
  }
}