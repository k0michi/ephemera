import crypto from 'crypto';
import fs from 'fs/promises';

export default class FSHelper {
  static async digest(filePath: string, algorithm: string) {
    await using stream = await fs.open(filePath, 'r');
    const hash = crypto.createHash(algorithm);
    const buffer = Buffer.alloc(8192);
    let bytesRead: number;

    do {
      const { bytesRead: br } = await stream.read(buffer, 0, buffer.length, null);
      bytesRead = br;

      if (bytesRead > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);

    return hash.digest('hex');
  }

  static async size(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }
}