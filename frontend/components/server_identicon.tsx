import ArrayHelper from '@ephemera/shared/lib/array_helper';
import Crypto from '@ephemera/shared/lib/crypto';
import Hex from '@ephemera/shared/lib/hex';
import React, { useEffect, useState } from 'react';
import { converter, clampGamut, formatRgb } from "culori";

export interface ServerIdenticonProps {
  data: Uint8Array;
  className?: string;
  style?: React.CSSProperties;
}

type GridCell = number[];

function lerpHue(h1: number, h2: number, t: number): number {
  let diff = h2 - h1;
  if (diff > 180) diff -= 360;
  else if (diff < -180) diff += 360;

  let result = h1 + (diff * t);
  return (result + 360) % 360;
}

function floorMod(a: number, b: number): number {
  return a - b * Math.floor(a / b);
}

function computeDrunkenBishopLooped1D(data: Uint8Array, numSegments: number): GridCell[] {
  const grid: GridCell[] = Array(numSegments).fill(null).map(() => []);
  let x = 0;

  ArrayHelper.strictGet(grid, x).push(0);
  for (let i = 0; i < data.length; i++) {
    const byte = ArrayHelper.strictGet(data, i);

    for (let step = 0; step < 8; step++) {
      const bit = (byte >> step) & 0x01;
      const dx = bit ? 1 : -1;

      x = floorMod(x + dx, numSegments);

      ArrayHelper.strictGet(grid, x).push(i * 8 + step + 1);
    }
  }

  return grid;
}

class Vec2 {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static add(v1: Vec2, v2: Vec2): Vec2 {
    return new Vec2(v1.x + v2.x, v1.y + v2.y);
  }

  static sub(v1: Vec2, v2: Vec2): Vec2 {
    return new Vec2(v1.x - v2.x, v1.y - v2.y);
  }

  static mul(v: Vec2, s: number): Vec2 {
    return new Vec2(v.x * s, v.y * s);
  }

  static dot(v1: Vec2, v2: Vec2): number {
    return v1.x * v2.x + v1.y * v2.y;
  }

  static norm(v: Vec2): Vec2 {
    const l = Math.sqrt(v.x * v.x + v.y * v.y);
    return l === 0 ? new Vec2(0, 0) : new Vec2(v.x / l, v.y / l);
  }

  static angleBetween(v1: Vec2, v2: Vec2): number {
    const dot = v1.x * v2.x + v1.y * v2.y;
    const clamped = Math.max(-1, Math.min(1, dot));
    return Math.acos(clamped);
  }
}

function calculateInsetVertex(P: Vec2, P_prev: Vec2, P_next: Vec2, W: number): Vec2 {
  if (W <= 0.01) return P;
  const v1 = Vec2.sub(P_prev, P);
  const v2 = Vec2.sub(P_next, P);
  const u1 = Vec2.norm(v1);
  const u2 = Vec2.norm(v2);
  const theta = Vec2.angleBetween(u1, u2);
  if (theta < 0.01 || Math.abs(theta - Math.PI) < 0.01) return P;

  const b = Vec2.norm(Vec2.add(u1, u2));
  const dist = W / (2 * Math.sin(theta / 2));

  return Vec2.add(P, Vec2.mul(b, dist));
}

function oklchToRgb(l: number, c: number, h: number): string {
  const oklch = { mode: "oklch", l, c, h };
  const toRgb = converter("rgb");
  const clampToSRGB = clampGamut("rgb");
  const rgb = toRgb(clampToSRGB(oklch));
  return formatRgb(rgb);
}

const kSize = 480;

export function render(bytes: Uint8Array, { numSegments, gapWidth }: { numSegments: number, gapWidth: number }): string {
  const cx = kSize / 2;
  const cy = kSize / 2;
  const R_OUTER = 200;
  const R_INNER = R_OUTER * (1 / Math.sqrt(3));

  const startHue = bytes.length >= 2 ? ArrayHelper.strictGet(bytes, 0) % 360 : 0;
  const endHue = bytes.length >= 2 ? ArrayHelper.strictGet(bytes, 1) % 360 : 120;

  const grid: GridCell[] = computeDrunkenBishopLooped1D(bytes, numSegments);

  const maxOffset = bytes.length * 8;
  // const threshold = 32;
  const threshold = 54;
  const radPerSeg = (2 * Math.PI) / numSegments;

  let svgPaths = [];

  for (let i = 0; i < numSegments; i++) {
    const cellVisits = ArrayHelper.strictGet(grid, i);
    const count = cellVisits.length;

    const points: Vec2[] = [];
    // {
    //   const ang1 = i * radPerSeg - (Math.PI / 2);
    //   const ang2 = (i + 1) * radPerSeg - (Math.PI / 2);
    //   const r1 = (i % 2 === 0) ? R_OUTER : R_INNER;
    //   const r2 = ((i + 1) % 2 === 0) ? R_OUTER : R_INNER;

    //   points.push(new Vec2(cx, cy));
    //   points.push(new Vec2(cx + r1 * Math.cos(ang1), cy + r1 * Math.sin(ang1)));
    //   points.push(new Vec2(cx + r2 * Math.cos(ang2), cy + r2 * Math.sin(ang2)));
    // }

    {

      const midAngle = i * radPerSeg - (Math.PI / 2);
      const startAngle = midAngle - (radPerSeg / 2);
      const endAngle = midAngle + (radPerSeg / 2);

      points.push(new Vec2(cx, cy));
      points.push(new Vec2(cx + R_INNER * Math.cos(startAngle), cy + R_INNER * Math.sin(startAngle)));
      points.push(new Vec2(cx + R_OUTER * Math.cos(midAngle), cy + R_OUTER * Math.sin(midAngle)));
      points.push(new Vec2(cx + R_INNER * Math.cos(endAngle), cy + R_INNER * Math.sin(endAngle)));
    }

    for (let j = 0; j < points.length; j++) {
      const P = ArrayHelper.strictGet(points, j);
      const P_prev = ArrayHelper.strictGet(points, (j - 1 + points.length) % points.length);
      const P_next = ArrayHelper.strictGet(points, (j + 1) % points.length);
      points[j] = calculateInsetVertex(P, P_prev, P_next, gapWidth);
    }

    let color;
    if (count > 0) {
      const normalizedCount = Math.min(count, threshold) / threshold;
      const lightness = 0.15 + (normalizedCount * 0.80);
      const chroma = Math.pow(normalizedCount, 2) * 0.28;
      const sumOffset = cellVisits.reduce((a, b) => a + b, 0);
      const avgOffset = sumOffset / count;
      const normalizedTime = avgOffset / Math.max(maxOffset, 1);
      const hue = lerpHue(startHue, endHue, normalizedTime);

      color = oklchToRgb(lightness, chroma, hue);
    } else {
      const midHue = lerpHue(startHue, endHue, 0.5);
      color = oklchToRgb(0.2, 0.05, midHue);
    }

    let d = '';

    for (let j = 0; j < points.length; j++) {
      const P = ArrayHelper.strictGet(points, j);
      if (j === 0) {
        d += `M${P.x.toFixed(2)},${P.y.toFixed(2)} `;
      } else {
        d += `L${P.x.toFixed(2)},${P.y.toFixed(2)} `;
      }
    }
    d += 'Z';

    svgPaths.push(`<path d="${d}" fill="${color}" stroke="none" />`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${kSize} ${kSize}">
  <g>
    ${svgPaths.join('')}
  </g>
</svg>`;
}

export default function ServerIdenticon(props: ServerIdenticonProps) {
  const { data, className, style } = props;
  const [svgString, setSvgString] = useState<string>('');
  const hex = Hex.fromUint8Array(data);
  const [digest, setDigest] = useState<Uint8Array>(new Uint8Array());

  useEffect(() => {
    (async () => {
      setDigest(await Crypto.digest(data));
    })();
  }, [hex]);

  useEffect(() => {
    setSvgString(render(digest, { numSegments: 7, gapWidth: 16 }));
  }, [digest]);

  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: svgString }}
      aria-label="Server Identicon"
    />
  );
}