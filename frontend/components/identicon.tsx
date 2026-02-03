import ArrayHelper from '@ephemera/shared/lib/array_helper';
import Crypto from '@ephemera/shared/lib/crypto';
import Hex from '@ephemera/shared/lib/hex';
import DrunkenBishop from 'lib/drunken_bishop';
import React, { useEffect, useState } from 'react';

export interface IdenticonProps {
  data: Uint8Array;
  className?: string;
  style?: React.CSSProperties;
}

const kGridWidth = 8;
const kGridHeight = 8;
const kScale = 1;

function lerpHue(h1: number, h2: number, t: number): number {
  let diff = h2 - h1;
  if (diff > 180) diff -= 360;
  else if (diff < -180) diff += 360;

  let result = h1 + (diff * t);
  return (result + 360) % 360;
}

async function render(data: Uint8Array): Promise<Blob> {
  const grid = DrunkenBishop.compute2D(data, kGridWidth, kGridHeight);

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

  const startHue = data.length >= 2 ? ArrayHelper.strictGet(data, 0) % 360 : 0;
  const endHue = data.length >= 2 ? ArrayHelper.strictGet(data, 1) % 360 : 120;
  const maxOffset = data.length * 4;

  for (let y = 0; y < kGridHeight; y++) {
    for (let x = 0; x < kGridWidth; x++) {
      const cell = ArrayHelper.strictGet(grid, y * kGridWidth + x);

      if (cell.length > 0) {
        const normalizedCount = Math.min(cell.length, 8) / 8;
        // const lightness = 0.35 + (normalizedCount * 0.60);
        const lightness = 0.15 + (normalizedCount * 0.80);

        // const chroma = 0.12 + (normalizedCount * 0.1);
        const chroma = Math.pow(normalizedCount, 2) * 0.28;

        const sumOffset = cell.reduce((a, b) => a + b, 0);
        const avgOffset = sumOffset / cell.length;
        // Avoid division by zero
        const normalizedTime = avgOffset / Math.max(maxOffset, 1);

        const currentHue = lerpHue(startHue, endHue, normalizedTime);

        ctx.fillStyle = `oklch(${lightness} ${chroma} ${currentHue})`;
        ctx.fillRect(x * kScale, y * kScale, kScale, kScale);
      } else {
        const midHue = lerpHue(startHue, endHue, 0.5);
        ctx.fillStyle = `oklch(0.1 0.02 ${midHue})`;
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