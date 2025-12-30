import {
  mysqlTable,
  char,
  tinyint,
  varchar,
  text,
  json,
  timestamp,
  bigint,
  int,
  index,
  uniqueIndex
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const posts = mysqlTable('posts', {
  /**
   * Post signal digest in hex encoding. This is always 32 bytes (64 hex characters).
   */
  id: char('id', { length: 64 }).primaryKey(),

  version: tinyint('version'),

  host: varchar('host', { length: 255 }),

  /**
   * Author's public key in Base37 encoding.
   * * The minimum length is 32 (00000000000000000000000000000000), and the maximum length is 50 (1ooe3w1qde9ohg2ehtl2z93u9e36mi9_nx_k795re4o1tbul1f).
   */
  author: varchar('author', { length: 50 }),

  content: text('content'),

  footer: json('footer'),

  /**
   * Post signal signature in hex encoding. This is always 64 bytes (128 hex characters).
   */
  signature: char('signature', { length: 128 }),

  insertedAt: timestamp('insertedAt').defaultNow(),

  createdAt: bigint('createdAt', { mode: 'bigint' }),

  seq: int('seq').autoincrement(),
}, (table) => [
  uniqueIndex('posts_seq_idx').on(table.seq),
]);