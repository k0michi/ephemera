import { Entity, PrimaryColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('posts')
@Index(['author', 'createdAt'])
@Index(['createdAt'])
export class Post {
  /**
   * Post signal digest in hex encoding. This is always 32 bytes (64 hex characters).
   */
  @PrimaryColumn({ type: 'char', length: 64 })
  id?: string;

  @Column({ type: 'tinyint' })
  version?: number;

  @Column({ type: 'varchar', length: 255 })
  host?: string;

  /**
   * Author's public key in Base37 encoding.
   * 
   * The minimum length is 32 (00000000000000000000000000000000), and the maximum length is 50 (1ooe3w1qde9ohg2ehtl2z93u9e36mi9_nx_k795re4o1tbul1f).
   */
  @Column({ type: 'varchar', length: 50 })
  author?: string;

  @Column({ type: 'text', charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  content?: string;

  @Column({ type: 'json' })
  footer?: unknown;

  /**
   * Post signal signature in hex encoding. This is always 64 bytes (128 hex characters).
   */
  @Column({ type: 'char', length: 128 })
  signature?: string;

  @CreateDateColumn()
  insertedAt?: Date;

  @Column({ type: 'bigint' })
  createdAt?: number;
}