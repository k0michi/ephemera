import crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import type { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

interface VideoMetadata {
  width: number;
  height: number;
  fps: number;
}

const kMaxrateKbpsByHeight: { height: number; maxrateKbps: number }[] = [
  { height: 360, maxrateKbps: 800 },
  { height: 720, maxrateKbps: 2500 },
  { height: 1080, maxrateKbps: 5000 },
];

function maxrateKbpsFor(targetHeight: number): number {
  const closest = kMaxrateKbpsByHeight.reduce((best, entry) =>
    Math.abs(entry.height - targetHeight) < Math.abs(best.height - targetHeight) ? entry : best
  );

  return closest.maxrateKbps;
}

const kDefaultFps = 30;

function parseFps(rFrameRate: string | undefined): number {
  if (rFrameRate === undefined) {
    return kDefaultFps;
  }

  const [numerator, denominator] = rFrameRate.split('/').map(Number);
  const fps = numerator === undefined
    ? NaN
    : denominator === undefined ? numerator : numerator / denominator;

  return Number.isFinite(fps) && fps > 0 ? fps : kDefaultFps;
}

export default class MediaTranscoder {
  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async encodeImageVariant(srcPath: string, destPath: string, size: number): Promise<void> {
    const tempPath = `${destPath}.${crypto.randomUUID()}.tmp`;

    try {
      await sharp(srcPath)
        .rotate()
        .resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(tempPath);

      await fs.rename(tempPath, destPath);
    } catch (e) {
      await fs.rm(tempPath, { force: true });
      throw e;
    }
  }

  static getVideoMetadata(srcPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(srcPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find((s) => s.codec_type === 'video');

        if (!videoStream || !videoStream.width || !videoStream.height) {
          reject(new Error('Video stream not found or invalid'));
          return;
        }

        resolve({ width: videoStream.width, height: videoStream.height, fps: parseFps(videoStream.r_frame_rate) });
      });
    });
  }

  static async encodeVideoVariant(srcPath: string, variantDir: string, targetHeight: number): Promise<void> {
    const stagingDir = `${variantDir}.${crypto.randomUUID()}.tmp`;
    await fs.mkdir(stagingDir, { recursive: true });

    try {
      await this.runVideoEncode(srcPath, stagingDir, targetHeight);
      await this.publishDir(stagingDir, variantDir);
    } finally {
      await fs.rm(stagingDir, { recursive: true, force: true });
    }
  }

  private static async runVideoEncode(srcPath: string, stagingDir: string, targetHeight: number): Promise<void> {
    const stagedM3u8 = path.join(stagingDir, 'index.m3u8');

    const meta = await this.getVideoMetadata(srcPath);
    const ratio = meta.width / meta.height;

    let width: number;
    let height: number;

    if (meta.width > meta.height) {
      height = targetHeight;
      width = Math.floor((targetHeight * ratio) / 2) * 2;
    } else {
      width = targetHeight;
      height = Math.floor((targetHeight / ratio) / 2) * 2;
    }

    const outputFps = Math.min(meta.fps, 30);

    const kCrf = 23;
    const maxrateKbps = maxrateKbpsFor(targetHeight);
    const vbvMaxrate = `${maxrateKbps}k`;
    const vbvBufsize = `${maxrateKbps * 2}k`;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(srcPath)
        .size(`${width}x${height}`)
        .videoCodec('libx264')
        .audioCodec('aac')
        .audioBitrate('128k')
        .outputOptions([
          '-f hls',
          '-hls_time 6',
          '-hls_list_size 0',
          `-hls_segment_filename ${path.join(stagingDir, 'seg_%03d.ts')}`,
          `-r ${outputFps}`,
          `-crf ${kCrf}`,
          `-maxrate ${vbvMaxrate}`,
          `-bufsize ${vbvBufsize}`,
          '-pix_fmt yuv420p',
          '-preset medium',
        ])
        .on('error', reject)
        .on('end', () => resolve())
        .save(stagedM3u8);
    });
  }

  private static async publishDir(stagingDir: string, finalDir: string): Promise<void> {
    try {
      await fs.rename(stagingDir, finalDir);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;

      if (code === 'ENOTEMPTY' || code === 'EEXIST') {
        return;
      }

      throw e;
    }
  }

  private static async measureBitrate(variantDir: string, indexPath: string): Promise<number | undefined> {
    const playlist = await fs.readFile(indexPath, 'utf8');

    const totalDuration = [...playlist.matchAll(/^#EXTINF:(\d+(?:\.\d+)?),/gm)]
      .reduce((sum, m) => sum + Number(m[1]), 0);

    if (totalDuration <= 0) {
      return undefined;
    }

    const segmentNames = playlist.split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));

    const sizes = await Promise.all(segmentNames.map(async (name) => {
      const stat = await fs.stat(path.join(variantDir, name));
      return stat.size;
    }));

    const totalBytes = sizes.reduce((sum, size) => sum + size, 0);

    return Math.round((totalBytes * 8) / totalDuration);
  }

  static async updateMasterPlaylist(hashDir: string): Promise<void> {
    let entries: Dirent[];

    try {
      entries = await fs.readdir(hashDir, { withFileTypes: true });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }

      throw e;
    }

    const variantLines: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const variantName = entry.name;
      const variantDir = path.join(hashDir, variantName);
      const indexPath = path.join(variantDir, 'index.m3u8');

      if (!(await this.exists(indexPath))) {
        continue;
      }

      const segments = await fs.readdir(variantDir);
      const firstSegment = segments.find((f) => f.endsWith('.ts') || f.endsWith('.aac'));

      if (!firstSegment) {
        continue;
      }

      try {
        const metadata = await this.getVideoMetadata(path.join(variantDir, firstSegment));
        const bandwidth = await this.measureBitrate(variantDir, indexPath);

        if (bandwidth === undefined) {
          continue;
        }

        const resolution = `${metadata.width}x${metadata.height}`;

        variantLines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}`);
        variantLines.push(`${variantName}/index.m3u8`);
      } catch {
        continue;
      }
    }

    const masterPath = path.join(hashDir, 'index.m3u8');

    if (variantLines.length === 0) {
      if (await this.exists(masterPath)) {
        await fs.unlink(masterPath);
      }

      return;
    }

    const masterContent = ['#EXTM3U', '#EXT-X-VERSION:3', ...variantLines].join('\n');
    const tempMasterPath = `${masterPath}.${crypto.randomUUID()}.tmp`;

    try {
      await fs.writeFile(tempMasterPath, masterContent);
      await fs.rename(tempMasterPath, masterPath);
    } catch (e) {
      await fs.rm(tempMasterPath, { force: true });
      throw e;
    }
  }
}
