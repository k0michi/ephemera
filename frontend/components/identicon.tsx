import ArrayHelper from '@ephemera/shared/lib/array_helper';
import Hex from '@ephemera/shared/lib/hex';
import NullableHelper from '@ephemera/shared/lib/nullable_helper';
import React, { useEffect, useState } from 'react';

export interface IdenticonProps {
  data: Uint8Array;
  className?: string;
  style?: React.CSSProperties;
  backgroundColor?: string;
}

const GRID_WIDTH = 8;
const GRID_HEIGHT = 8;

const DEFAULT_BG = '#101010';

type GridCell = number[];

function lerpHue(h1: number, h2: number, t: number): number {
  let diff = h2 - h1;
  if (diff > 180) diff -= 360;
  else if (diff < -180) diff += 360;

  let result = h1 + (diff * t);
  return (result + 360) % 360;
}

function computeDrunkenBishop(data: Uint8Array): GridCell[] {
  const grid: GridCell[] = Array(GRID_WIDTH * GRID_HEIGHT).fill(null).map(() => []);
  let x = Math.floor(GRID_WIDTH / 2);
  let y = Math.floor(GRID_HEIGHT / 2);

  ArrayHelper.strictGet(grid, y * GRID_WIDTH + x).push(0);
  for (let i = 0; i < data.length; i++) {
    const byte = ArrayHelper.strictGet(data, i);

    for (let step = 0; step < 4; step++) {
      const pair = (byte >> (2 * step)) & 0x03;

      const dx = (pair & 0x01) ? 1 : -1;
      const dy = (pair & 0x02) ? 1 : -1;

      x = Math.max(0, Math.min(GRID_WIDTH - 1, x + dx));
      y = Math.max(0, Math.min(GRID_HEIGHT - 1, y + dy));

      ArrayHelper.strictGet(grid, y * GRID_WIDTH + x).push(i * 4 + step + 1);
    }
  }

  return grid;
};

async function render(data: Uint8Array): Promise<Blob> {
  const scale = 1;
  const backgroundColor = DEFAULT_BG;

  const grid = computeDrunkenBishop(data);

  let canvas: OffscreenCanvas | HTMLCanvasElement;
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

  const width = GRID_WIDTH * scale;
  const height = GRID_HEIGHT * scale;

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
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  const maxOffset = data.length * 4;

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = ArrayHelper.strictGet(grid, y * GRID_WIDTH + x);

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
        ctx.fillRect(x * scale, y * scale, scale, scale);
      } else {
        const midHue = lerpHue(startHue, endHue, 0.5);
        ctx.fillStyle = `oklch(0.1 0.02 ${midHue})`;
        ctx.fillRect(x * scale, y * scale, scale, scale);
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

export function Identicon({
  data,
  className,
  style,
  backgroundColor = DEFAULT_BG,
}: IdenticonProps) {
  const scale = 1;
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const hex = Hex.fromUint8Array(data);
    const cached = cache.get(hex);

    if (cached !== undefined) {
      cache.set(hex, { url: cached.url, count: cached.count + 1 });
      setImageUrl(cached.url);
    } else {
      const generateImage = async () => {
        try {
          const blob = await render(data);
          const cached = cache.get(hex);

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
  }, [data, scale, backgroundColor]);

  const imageStyle: React.CSSProperties = {
    imageRendering: 'pixelated',
    display: 'block',
    ...style,
  };

  if (!imageUrl) {
    return <div aria-hidden="true" style={{ width: GRID_WIDTH * scale, height: GRID_HEIGHT * scale, background: backgroundColor }} />;
  }

  return (
    <img
      src={imageUrl}
      alt=""
      aria-hidden="true"
      className={className}
      style={imageStyle}
      width={GRID_WIDTH * scale}
      height={GRID_HEIGHT * scale}
    />
  );
};

export default React.memo(Identicon);