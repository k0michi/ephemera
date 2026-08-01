import AttachmentUtil, { type AttachmentCategory, type AttachmentVariant } from '@ephemera/shared/lib/attachment_util.js';
import fs from 'fs/promises';
import path from 'path';

import type Config from './config.js';
import MediaTranscoder from './media_transcoder.js';

function parseVariantSize(variant: Exclude<AttachmentVariant, 'index'>): number {
  const size = Number(variant);

  if (!Number.isFinite(size) || size <= 0) {
    throw new Error(`Variant "${variant}" is not a valid encode size`);
  }

  return size;
}

export interface ITranscoderService {
  encodeAll(hash: string, kind: AttachmentCategory): Promise<void>;

  encodeVariant(hash: string, kind: AttachmentCategory, variant: AttachmentVariant): Promise<void>;
}

export class TranscoderService implements ITranscoderService {
  private config: Config;
  private inFlight = new Map<string, Promise<void>>();

  constructor(config: Config) {
    this.config = config;
  }

  async encodeAll(hash: string, kind: AttachmentCategory): Promise<void> {
    await Promise.all(
      AttachmentUtil.getVariants(kind)
        .filter((variant) => variant !== 'index')
        .map((variant) => this.encodeVariant(hash, kind, variant))
    );
  }

  encodeVariant(hash: string, kind: AttachmentCategory, variant: AttachmentVariant): Promise<void> {
    if (variant === 'index') {
      return this.encodeAll(hash, kind);
    }

    const key = `${hash}/${variant}`;
    const existing = this.inFlight.get(key);

    if (existing) {
      return existing;
    }

    const promise = this.runEncode(hash, kind, variant).finally(() => {
      this.inFlight.delete(key);
    });

    this.inFlight.set(key, promise);
    return promise;
  }

  private async runEncode(hash: string, kind: AttachmentCategory, variant: Exclude<AttachmentVariant, 'index'>): Promise<void> {
    const srcPath = path.join(this.config.attachmentsDir, hash);
    const hashDir = path.join(this.config.variantsDir, hash);
    const size = parseVariantSize(variant);

    await fs.mkdir(hashDir, { recursive: true });

    if (kind === 'image') {
      const destPath = path.join(hashDir, `${variant}.webp`);

      if (await MediaTranscoder.exists(destPath)) {
        return;
      }

      await MediaTranscoder.encodeImageVariant(srcPath, destPath, size);
      return;
    }

    const variantDir = path.join(hashDir, variant);
    const indexPath = path.join(variantDir, 'index.m3u8');

    if (await MediaTranscoder.exists(indexPath)) {
      return;
    }

    await MediaTranscoder.encodeVideoVariant(srcPath, variantDir, size);
    await MediaTranscoder.updateMasterPlaylist(hashDir);
  }
}
