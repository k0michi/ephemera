import ArrayHelper from '@ephemera/shared/lib/array_helper';
import Crypto from '@ephemera/shared/lib/crypto';
import Hex from '@ephemera/shared/lib/hex';
import MathHelper from '@ephemera/shared/lib/math_helper';
import DrunkenBishop from 'lib/drunken_bishop';
import React, { useEffect, useState } from 'react';

export interface IdenticonProps {
  data: Uint8Array;
  className?: string;
  style?: React.CSSProperties;
}

const kGridWidth = 16;
const kGridHeight = 16;
const kScale = 1;

async function render(data: Uint8Array): Promise<Blob> {
  const grid = DrunkenBishop.compute2DReflect(data, kGridWidth, kGridHeight);

  let canvas: OffscreenCanvas | HTMLCanvasElement;
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

  const width = kGridWidth * kScale;
  const height = kGridHeight * kScale;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#202020';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = 'lighter';
  for (let y = 0; y < kGridHeight; y++) {
    for (let x = 0; x < kGridWidth; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = `oklch(10% 0 0 / 1)`;
        ctx.fillRect(x * kScale, y * kScale, kScale, kScale);
      }
    }
  }

  const startHue = ArrayHelper.getOrDefault(data, 0, 0) / 255 * 360;
  const startChroma = ArrayHelper.getOrDefault(data, 1, 0) / 255 * 0.1;
  const endHue = ArrayHelper.getOrDefault(data, 2, 0) / 255 * 360;
  const endChroma = ArrayHelper.getOrDefault(data, 3, 0) / 255 * 0.1;
  const maxOffset = data.length * 4;

  for (let y = 0; y < kGridHeight; y++) {
    for (let x = 0; x < kGridWidth; x++) {
      const cell = ArrayHelper.strictGet(grid, y * kGridWidth + x);

      for (let i = 0; i < cell.length; i++) {
        const t = ArrayHelper.strictGet(cell, i);
        const normalizedT = t / maxOffset;
        const lightness = 0.25;
        const chroma = MathHelper.lerp(startChroma, endChroma, normalizedT);
        const hue = MathHelper.slerp(startHue, endHue, normalizedT);
        const alpha = 1;

        ctx.fillStyle = `oklch(${lightness * 100}% ${chroma} ${hue} / ${alpha})`;
        ctx.fillRect(x * kScale, y * kScale, kScale, kScale);
      }
    }
  }

  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: 'image/png' });
  } else if (canvas instanceof HTMLCanvasElement) {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    });
  }

  throw new Error('Unknown canvas type');
}

type CacheEntry = {
  url: string;
  count: number;
};

const cache = new Map<string, CacheEntry>();

export default function Identicon({
  data,
  className,
  style,
}: IdenticonProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const hex = Hex.fromUint8Array(data);

  useEffect(() => {
    const cached = cache.get(hex);
    let ignore = false;

    if (cached !== undefined) {
      cache.set(hex, { url: cached.url, count: cached.count + 1 });
      setImageUrl(cached.url);
    } else {
      const generateImage = async () => {
        try {
          const digest = await Crypto.digest(data);
          const blob = await render(digest);

          // If the component was unmounted while rendering
          if (ignore) {
            return;
          }

          const cached = cache.get(hex);

          // There is another instance that created the same identicon while we were rendering
          if (cached !== undefined) {
            cache.set(hex, { url: cached.url, count: cached.count + 1 });
            setImageUrl(cached.url);
            return;
          }

          const objectUrl = URL.createObjectURL(blob);
          cache.set(hex, { url: objectUrl, count: 1 });
          setImageUrl(objectUrl);
        } catch (e) {
          console.error('Failed to generate identicon:', e);
        }
      };

      generateImage();
    }

    return () => {
      // Prevent increasing reference count
      ignore = true;

      const cached = cache.get(hex);

      if (cached !== undefined) {
        if (cached.count <= 1) {
          URL.revokeObjectURL(cached.url);
          cache.delete(hex);
        } else {
          cache.set(hex, { url: cached.url, count: cached.count - 1 });
        }
      }
    };
  }, [hex]);

  const imageStyle: React.CSSProperties = {
    imageRendering: 'pixelated',
    display: 'block',
    ...style,
  };

  if (!imageUrl) {
    return <div aria-hidden="true" className={className} style={imageStyle} />;
  }

  return (
    <img
      src={imageUrl}
      alt=""
      aria-hidden="true"
      className={className}
      style={imageStyle}
    />
  );
};