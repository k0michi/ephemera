import sharp from "sharp";
import { describe, expect, it } from "vitest";

import MediaTranscoder from "../app/media_transcoder.js";
import TestHelper from "./test_helper.js";

describe('MediaTranscoder', () => {
  it('should preserve animation when encoding an animated GIF to WebP', async () => {
    const src = await TestHelper.newDummyAnimatedGif({
      width: 32,
      height: 32,
      frameCount: 5,
      fps: 5
    });

    const dest = `${await TestHelper.newTempFile()}.webp`;

    await MediaTranscoder.encodeImageVariant(src, dest, 64);

    const metadata = await sharp(dest).metadata();
    expect(metadata.pages).toBe(5);
  }, 30_000);
});
