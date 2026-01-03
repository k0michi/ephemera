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

export interface IAttachmentService {
  fileDigest(filePath: string): Promise<string>;

  fileSize(filePath: string): Promise<number>;

  moveFrom(srcFile: string, type: string): Promise<string>;

  open(hash: string): Promise<fs.FileHandle>;

  getType(hash: string): Promise<string>;

  linkPost(postId: string, attachmentIds: string[]): Promise<void>;

  getFilePath(hash: string): string;

  removeOrphans(): Promise<void>;
}

export class AttachmentService implements IAttachmentService {
  private config: Config;
  private database: MySql2Database;
  private _kMaxAttachmentSize: number = 16 * 1024 * 1024; // 16 MB
  private _kAllowedAttachmentTypes: Set<string> = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
  ]);

  constructor(config: Config, database: MySql2Database) {
    this.config = config;
    this.database = database;
  }

  get attachmentsDir(): string {
    return path.join(this.config.dataDir, 'attachments');
  }

  async fileDigest(filePath: string): Promise<string> {
    const stream = await fs.open(filePath, 'r');
    const hash = crypto.createHash('sha256');
    const buffer = Buffer.alloc(8192);
    let bytesRead: number;

    do {
      const { bytesRead: br } = await stream.read(buffer, 0, buffer.length, null);
      bytesRead = br;

      if (bytesRead > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);

    await stream.close();
    return hash.digest('hex');
  }

  async fileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }

  async moveFrom(srcFile: string, type: string): Promise<string> {
    await fs.mkdir(this.attachmentsDir, { recursive: true });

    const hash = await this.fileDigest(srcFile);
    const destFile = this.getFilePath(hash);
    const size = await this.fileSize(srcFile);

    if (size > this._kMaxAttachmentSize) {
      throw new ApiError('Attachment size exceeds maximum allowed size', 400);
    }

    // TODO: Use file-type
    if (!this._kAllowedAttachmentTypes.has(type)) {
      throw new ApiError('Attachment type is not allowed', 400);
    }

    await fs.rename(srcFile, destFile);

    await this.database.insert(attachments).ignore().values({
      id: hash,
      type: type,
      size: size,
    }).execute();

    return hash;
  }

  async open(hash: string): Promise<fs.FileHandle> {
    const filePath = this.getFilePath(hash);
    return await fs.open(filePath, 'r');
  }

  async getType(hash: string): Promise<string> {
    const result = await this.database
      .select({
        type: attachments.type,
      })
      .from(attachments)
      .where(eq(attachments.id, hash))
      .limit(1)
      .execute();

    if (result.length === 0) {
      throw new Error('Attachment not found');
    }

    return NullableHelper.unwrap(result[0]?.type);
  }

  async linkPost(postId: string, attachmentIds: string[]): Promise<void> {
    for (const attachmentId of attachmentIds) {
      await this.database.insert(postAttachments).values({
        postId: postId,
        attachmentId: attachmentId,
      }).execute();
    }
  }

  getFilePath(hash: string): string {
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