import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AttachmentService } from "../app/attachment_service.js";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import type { Pool } from "mysql2";
import type { StartedMariaDbContainer } from "@testcontainers/mariadb";
import TestHelper from "./test_helper.js";
import { migrate } from "drizzle-orm/mysql2/migrator";
import FSHelper from "../app/fs_helper.js";
import fsPromises from "fs/promises";

describe('AttachmentService', () => {
  let container: StartedMariaDbContainer;
  let database: MySql2Database;
  let pool: Pool;
  let attachmentService: AttachmentService;

  beforeAll(async () => {
    container = await TestHelper.startDbContainer();

    const db = drizzle(container.getConnectionUri());
    pool = db.$client;
    database = db;
    await migrate(db, { migrationsFolder: './drizzle' });

    const config = TestHelper.getConfig(container);
    attachmentService = new AttachmentService(config, database);
  }, 60_000);

  afterAll(async () => {
    await TestHelper.endPool(pool);
    await container.stop();
  });

  it('should accept a image attachment', async () => {
    await database.transaction(async (tx) => {
      const testImage = await TestHelper.newDummyImage(
        {
          width: 800,
          height: 600,
          format: 'png',
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
          format: 'png',
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

  it('should accept a video attachment', async () => {
    await database.transaction(async (tx) => {
      const testVideo = await TestHelper.newDummyVideo({
        duration: 2,
        width: 10,
        height: 10,
        format: 'mp4',
        fps: 30,
      });

      const attachmentId = await attachmentService.copyFrom(testVideo, tx);

      const filePath = attachmentService.getFilePath(attachmentId);

      await TestHelper.assertFileEquals(testVideo, filePath);
    });
  }, 60_000);
});