import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AttachmentService } from "../app/attachment_service.js";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import type { Pool } from "mysql2";
import type { StartedMariaDbContainer } from "@testcontainers/mariadb";
import TestHelper from "./test_helper.js";
import { migrate } from "drizzle-orm/mysql2/migrator";
import FSHelper from "../app/fs_helper.js";

describe('AttachmentService', () => {
  let container: StartedMariaDbContainer;
  let database: MySql2Database;
  let pool: Pool;
  let attachmentService: AttachmentService;

  beforeEach(async () => {
    container = await TestHelper.startDbContainer();

    const db = drizzle(container.getConnectionUri());
    pool = db.$client;
    database = db;
    await migrate(db, { migrationsFolder: './drizzle' });

    const config = TestHelper.getConfig(container);
    attachmentService = new AttachmentService(config, database);
  }, 60_000);

  afterEach(async () => {
    await TestHelper.endPool(pool);
    await container.stop();
  });

  it('should create a new attachment from a file', async () => {
    await database.transaction(async (tx) => {
      const testImage = await TestHelper.newDummyImage(
        800,
        600,
        'png',
        true
      );

      const attachmentId = await attachmentService.copyFrom(testImage, tx);

      const filePath = attachmentService.getFilePath(attachmentId);

      await TestHelper.assertFileEquals(testImage, filePath);
    });
  }, 60_000);
});