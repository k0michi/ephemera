import Base37 from "@ephemera/shared/lib/base37.js";
import Crypto from "@ephemera/shared/lib/crypto.js";
import { MariaDbContainer, type StartedMariaDbContainer } from "@testcontainers/mariadb";
import ffmpeg from 'fluent-ffmpeg';
import fsPromises from 'fs/promises';
import os from "os";
import path from "path";
import sharp from "sharp";
import { expect } from "vitest";

import Config from "../app/config.js";
import type { ImageType, VideoCodec, VideoType } from "@ephemera/shared/lib/attachment_util.js";
import AttachmentUtil from "@ephemera/shared/lib/attachment_util.js";

export default class TestHelper {
  static startDbContainer() {
    return new MariaDbContainer('mariadb:11')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withUserPassword('test_pw')
      .start();
  }

  static getConfig(container: StartedMariaDbContainer) {
    const keyPair = Crypto.generateKeyPair();
    const config = new Config({
      host: 'example.com',
      port: 3000,
      dbHost: container.getHost(),
      dbPort: container.getPort(),
      dbUser: container.getUsername(),
      dbPassword: container.getUserPassword(),
      dbName: container.getDatabase(),
      dbConnectionLimit: 5,
      dbQueueLimit: 500,
      dbConnectTimeout: 10000,
      peerHost: 'peer:50051',
      allowedTimeSkewMillis: 5 * 60 * 1000,
      privateKey: Base37.fromUint8Array(keyPair.privateKey),
      publicKey: Base37.fromUint8Array(keyPair.publicKey),
    });
    return config;
  }

  static async newTempFile(): Promise<string> {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ephemera-test-"));
    const name = `file-${crypto.randomUUID()}`;
    const filePath = path.join(dir, name);
    return filePath;
  }

  static async newDummyImage({
    width,
    height,
    type,
    alpha
  }: {
    width: number;
    height: number;
    type: ImageType;
    alpha: boolean;
  }): Promise<string> {
    const channels = alpha ? 4 : 3;
    const size = width * height * channels;
    const randomBuffer = Buffer.alloc(size);

    for (let i = 0; i < size; i++) {
      randomBuffer[i] = Math.floor(Math.random() * 256);
    }

    let image = sharp(randomBuffer, {
      raw: {
        width,
        height,
        channels,
      }
    });

    const mimeMap: Record<ImageType, { ext: string; render: () => sharp.Sharp }> = {
      'image/png': { ext: 'png', render: () => image.png() },
      'image/jpeg': { ext: 'jpg', render: () => image.jpeg() },
      'image/webp': { ext: 'webp', render: () => image.webp() },
      'image/gif': { ext: 'gif', render: () => image.gif() },
    };

    const { ext, render } = mimeMap[type];
    image = render();

    let filePath = await this.newTempFile();
    filePath += `.${ext}`;

    await image.toFile(filePath);
    return filePath;
  }

  static async assertFileEquals(filePath1: string, filePath2: string): Promise<void> {
    const buffer1 = await fsPromises.readFile(filePath1);
    const buffer2 = await fsPromises.readFile(filePath2);
    expect(buffer1).toEqual(buffer2);
  }

  static async newDummyVideo({
    width,
    height,
    duration,
    type,
    codec,
    fps
  }: {
    width: number;
    height: number;
    duration: number;
    type: VideoType;
    codec: VideoCodec;
    fps: number;
  }): Promise<string> {
    const extension = AttachmentUtil.getExtension(type);

    let outputPath = await this.newTempFile();
    outputPath += `.${extension}`;

    const encoderMap: Record<VideoCodec, string> = {
      'h264': 'libx264',
      'vp8': 'libvpx',
      'vp9': 'libvpx-vp9',
      'av1': 'libaom-av1',
      'h265': 'libx265'
    };

    const dummyImagePath = await this.newDummyImage({
      width,
      height,
      type: 'image/png',
      alpha: false
    });

    return new Promise((resolve, reject) => {
      const command = ffmpeg(dummyImagePath)
        .inputOptions([
          '-loop 1',
          `-t ${duration}`
        ]);

      command.videoCodec(encoderMap[codec]);

      const outputOptions = [`-r ${fps}`];

      if (['h264', 'h265', 'av1'].includes(codec)) {
        outputOptions.push('-pix_fmt yuv420p');
      }

      if (codec === 'h265' && (type === 'video/mp4' || type === 'video/quicktime')) {
        outputOptions.push('-tag:v hvc1');
      }

      if (codec === 'av1') {
        outputOptions.push('-cpu-used 8');
      }

      command
        .outputOptions(outputOptions)
        .on('error', (err) => {
          reject(err);
        })
        .on('end', () => {
          resolve(outputPath);
        })
        .save(outputPath);
    });
  }
}