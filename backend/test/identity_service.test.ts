import Base37 from '@ephemera/shared/lib/base37.js';
import Crypto from '@ephemera/shared/lib/crypto.js';
import NullableHelper from '@ephemera/shared/lib/nullable_helper.js';
import { StartedMariaDbContainer } from "@testcontainers/mariadb";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { createPool, type Pool } from 'mysql2/promise';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { PooledDatabase } from '../app/database.js';
import IdentityService from '../app/identity_service.js';
import TestHelper from './test_helper.js';

describe('IdentityService', () => {
  let container: StartedMariaDbContainer;
  let database: PooledDatabase;
  let pool: Pool;
  let identityService: IdentityService;
  let allowedIdentities: string[];
  let deniedIdentities: string[];

  beforeEach(async () => {
    container = await TestHelper.startDbContainer();

    const db = drizzle(createPool(container.getConnectionUri()));
    pool = db.$client;
    database = db;
    await migrate(db, { migrationsFolder: './drizzle' });

    const config = TestHelper.getConfig(container);

    allowedIdentities = [];
    deniedIdentities = [];

    for (let i = 0; i < 2; i++) {
      const keyPair = Crypto.generateKeyPair();
      const publicKey = Base37.fromUint8Array(keyPair.publicKey);
      if (i == 0) {
        allowedIdentities.push(publicKey);
      } else {
        deniedIdentities.push(publicKey);
      }
    }

    config.allowedIdentities = allowedIdentities;
    config.deniedIdentities = deniedIdentities;

    identityService = new IdentityService(config);
  }, 60_000);

  afterEach(async () => {
    await pool.end();
    await container.stop();
  });

  describe('getPermissions', () => {
    it('should return write permission for allowed identity', async () => {
      const identity = NullableHelper.unwrap(allowedIdentities[0]);
      const permissions = await identityService.getPermissions(identity);
      expect(permissions.has('write')).toBe(true);
    });

    it('should not return write permission for denied identity', async () => {
      const identity = NullableHelper.unwrap(deniedIdentities[0]);
      const permissions = await identityService.getPermissions(identity);
      expect(permissions.has('write')).toBe(false);
    });
  });
});