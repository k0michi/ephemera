import { MariaDbContainer, type StartedMariaDbContainer } from "@testcontainers/mariadb";
import Config from "../app/config.js";
import type { Pool } from "mysql2";
import fsPromises from 'fs/promises';
import sharp from "sharp";
import { expect } from "vitest";
import path from "path";
import os from "os";
import ffmpeg from 'fluent-ffmpeg';

export default class TestHelper {
  static startDbContainer() {
    return new MariaDbContainer('mariadb:11')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withUserPassword('test_pw')
      .start();
  }

  static getConfig(container: StartedMariaDbContainer) {
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
      allowedTimeSkewMillis: 5 * 60 * 1000,
    });
    return config;
  }

  static endPool(pool: Pool): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      pool.end(err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  static async newTempFile(): Promise<string> {
    const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ephemera-test-"));
    const name = `file-${crypto.randomUUID()}`;
    const filePath = path.join(dir, name);
    return filePath;
  }

  static async newDummyImage({ width, height, format, alpha }: { width: number, height: number, format: 'png' | 'jpeg' | 'webp' | 'gif', alpha: boolean }): Promise<string> {
    const size = width * height * (alpha ? 4 : 3);
    const randomBuffer = Buffer.alloc(size);

    for (let i = 0; i < size; i++) {
      randomBuffer[i] = Math.floor(Math.random() * 256);
    }

    let image = sharp(randomBuffer, {
      raw: {
        width: width,
        height: height,
        channels: alpha ? 4 : 3,
      }
    });

    switch (format) {
      case 'png':
        image = image.png();
        break;
      case 'jpeg':
        image = image.jpeg();
        break;
      case 'webp':
        image = image.webp();
        break;
      case 'gif':
        image = image.gif();
        break;
    }

    const filePath = await this.newTempFile();
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
    format = 'mp4',
    fps = 30
  }: {
    width: number;
    height: number;
    duration: number;
    format: 'mp4' | 'webm';
    fps?: number;
  }): Promise<string> {
    const outputPath = await this.newTempFile();

    const dummyImagePath = await this.newDummyImage({
      width,
      height,
      format: 'png',
      alpha: false
    });

    return new Promise((resolve, reject) => {
      const command = ffmpeg(dummyImagePath)
        .inputOptions([
          '-loop 1',
          `-t ${duration}`
        ]);

      if (format === 'mp4') {
        command
          .videoCodec('libx264')
          .outputOptions([
            '-pix_fmt yuv420p',
            `-r ${fps}`
          ]);
      } else {
        command
          .videoCodec('libvpx-vp9')
          .outputOptions([`-r ${fps}`]);
      }

      command
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