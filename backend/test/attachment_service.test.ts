import type { StartedMariaDbContainer } from "@testcontainers/mariadb";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import fsPromises from "fs/promises";
import type { Pool } from "mysql2/promise";
import { createPool } from "mysql2/promise";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AttachmentService } from "../app/attachment_service.js";
import type { PooledDatabase } from "../app/database.js";
import FSHelper from "../app/fs_helper.js";
import TestHelper from "./test_helper.js";
import type { StartedRedisContainer } from "@testcontainers/redis";

describe('AttachmentService', () => {
  let container: StartedMariaDbContainer;
  let redisContainer: StartedRedisContainer;
  let database: PooledDatabase;
  let pool: Pool;
  let attachmentService: AttachmentService;

  beforeEach(async () => {
    container = await TestHelper.startDbContainer();
    redisContainer = await TestHelper.startRedisContainer();

    const db = drizzle(createPool(container.getConnectionUri()));
    pool = db.$client;
    database = db;
    await migrate(db, { migrationsFolder: './drizzle' });

    const config = TestHelper.getConfig(container, redisContainer);
    attachmentService = new AttachmentService(config, database);
  }, 60_000);

  afterEach(async () => {
    await pool.end();
    await container.stop();
  });

  it('should accept a image attachment', async () => {
    await database.transaction(async (tx) => {
      const testImage = await TestHelper.newDummyImage(
        {
          width: 800,
          height: 600,
          type: 'image/png',
          alpha: true
        }
      );

      const attachmentId = await attachmentService.copyFrom(testImage, tx);

      const filePath = attachmentService.getFilePath(attachmentId);

      await TestHelper.assertFileEquals(testImage, filePath);
    });
  }, 60_000);

  it('should reject an oversized attachment', async () => {
    await database.transaction(async (tx) => {
      const testImage = await TestHelper.newDummyImage(
        {
          width: 10000,
          height: 10000,
          type: 'image/png',
          alpha: true
        }
      );

      await expect(attachmentService.copyFrom(testImage, tx)).rejects.toThrow();
    });
  }, 60_000);

  it('should reject an unsupported attachment type', async () => {
    await database.transaction(async (tx) => {
      const tempFile = await TestHelper.newTempFile();
      await fsPromises.writeFile(tempFile, 'This is a text file.');
      await expect(attachmentService.copyFrom(tempFile, tx)).rejects.toThrow();
    });
  }, 60_000);

  it.each([
    { type: 'video/mp4', codec: 'h264' },
    { type: 'video/mp4', codec: 'vp9' },
    { type: 'video/mp4', codec: 'av1' },
    { type: 'video/webm', codec: 'vp8' },
    { type: 'video/webm', codec: 'vp9' },
    { type: 'video/webm', codec: 'av1' },
    { type: 'video/quicktime', codec: 'h264' },
  ] as const)('should accept $type with $codec', async ({ type, codec }) => {
    await database.transaction(async (tx) => {
      const testVideo = await TestHelper.newDummyVideo({
        duration: 1, width: 32, height: 32, type, codec, fps: 1
      });

      const attachmentId = await attachmentService.copyFrom(testVideo, tx);
      expect(attachmentId).toBeDefined();

      await TestHelper.assertFileEquals(testVideo, attachmentService.getFilePath(attachmentId));
    });
  }, 60_000);

  it.each([
    { type: 'video/mp4', codec: 'h265' },
    { type: 'video/quicktime', codec: 'h265' },
  ] as const)('should reject $type with unsupported codec $codec', async ({ type, codec }) => {
    await database.transaction(async (tx) => {
      const testVideo = await TestHelper.newDummyVideo({
        duration: 1, width: 32, height: 32, type, codec, fps: 1
      });

      await expect(attachmentService.copyFrom(testVideo, tx))
        .rejects.toThrow();
    });
  }, 60_000);

  it('should reject an oversized video attachment', async () => {
    await database.transaction(async (tx) => {
      const testVideo = await TestHelper.newDummyVideo({
        duration: 1,
        width: 5000,
        height: 5000,
        type: 'video/mp4',
        codec: 'h264',
        fps: 1
      });

      await expect(attachmentService.copyFrom(testVideo, tx)).rejects.toThrow();
    });
  }, 60_000);

  it('should remove unlinked files', async () => {
    const p = path.join(attachmentService.attachmentsDir, 'nonexistent');
    await FSHelper.ensureParentDir(p);
    await fsPromises.writeFile(p, 'dummy data');

    const removedFiles = await attachmentService.removeUnlinkedFiles();
    expect(removedFiles).toContain('nonexistent');
  });
});