import { Entity, PrimaryColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('posts')
@Index(['author', 'createdAt'])
@Index(['createdAt'])
export class Post {
  @PrimaryColumn({ type: 'char', length: 64 })
  id?: string;

  @Column({ type: 'tinyint', default: 1 })
  version?: number;

  @Column({ type: 'varchar', length: 255 })
  host?: string;

  @Column({ type: 'char', length: 64 })
  author?: string;

  @Column({ type: 'text', charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  content?: string;

  @Column({ type: 'json', nullable: true })
  footer?: any;

  @Column({ type: 'char', length: 128 })
  signature?: string;

  @CreateDateColumn()
  insertedAt?: Date;

  @Column({ type: 'bigint' })
  createdAt?: number;
}