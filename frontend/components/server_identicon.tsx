import ArrayHelper from '@ephemera/shared/lib/array_helper';
import Crypto from '@ephemera/shared/lib/crypto';
import Hex from '@ephemera/shared/lib/hex';
import React, { useEffect, useState } from 'react';
import { converter, clampGamut, formatRgb, oklch } from "culori";
import NullableHelper from '@ephemera/shared/lib/nullable_helper';
import MathHelper from '@ephemera/shared/lib/math_helper';
import Vector2 from '@ephemera/shared/lib/vector2';
import DrunkenBishop from 'lib/drunken_bishop';

export interface ServerIdenticonProps {
  data: Uint8Array;
  className?: string;
  style?: React.CSSProperties;
}

function calculateInsetVertex(P: Vector2, P_prev: Vector2, P_next: Vector2, W: number): Vector2 {
  if (W <= 0.01) return P;
  const v1 = Vector2.sub(P_prev, P);
  const v2 = Vector2.sub(P_next, P);
  const u1 = Vector2.norm(v1);
  const u2 = Vector2.norm(v2);
  const theta = Vector2.angleBetween(u1, u2);
  if (theta < 0.01 || Math.abs(theta - Math.PI) < 0.01) return P;

  const b = Vector2.norm(Vector2.add(u1, u2));
  const dist = W / (2 * Math.sin(theta / 2));

  return Vector2.add(P, Vector2.mul(b, dist));
}

function oklchToRgb(l: number, c: number, h: number): { r: number, g: number, b: number } {
  const toRgb = converter("rgb");
  const clampToSRGB = clampGamut("rgb");
  const rgb = toRgb(clampToSRGB(oklch({ l, c, h, mode: "oklch" })));
  const r = NullableHelper.unwrap(rgb?.r);
  const g = NullableHelper.unwrap(rgb?.g);
  const b = NullableHelper.unwrap(rgb?.b);
  return { r, g, b };
}

function addRgb(c1: { r: number, g: number, b: number }, c2: { r: number, g: number, b: number }): { r: number, g: number, b: number } {
  return {
    r: MathHelper.clamp(c1.r + c2.r, 0, 1),
    g: MathHelper.clamp(c1.g + c2.g, 0, 1),
    b: MathHelper.clamp(c1.b + c2.b, 0, 1),
  };
}

const kSize = 400;

export function render(bytes: Uint8Array, { numSegments, gapWidth }: { numSegments: number, gapWidth: number }): string {
  const cx = kSize / 2;
  const cy = kSize / 2;
  const R_OUTER = 200;
  const R_INNER = R_OUTER * (1 / Math.sqrt(3));

  const startHue = ArrayHelper.getOrDefault(bytes, 0, 0) / 255 * 360;
  const startChroma = ArrayHelper.getOrDefault(bytes, 1, 0) / 255 * 0.025;
  const endHue = ArrayHelper.getOrDefault(bytes, 2, 0) / 255 * 360;
  const endChroma = ArrayHelper.getOrDefault(bytes, 3, 0) / 255 * 0.025;

  const grid = DrunkenBishop.computeLooped1D(bytes, numSegments);

  const maxOffset = bytes.length * 8;
  const radPerSeg = (2 * Math.PI) / numSegments;

  let svgPaths = [];

  for (let i = 0; i < numSegments; i++) {
    const cellVisits = ArrayHelper.strictGet(grid, i);
    const count = cellVisits.length;

    const points: Vector2[] = [];

    {
      const midAngle = i * radPerSeg - (Math.PI / 2);
      const startAngle = midAngle - (radPerSeg / 2);
      const endAngle = midAngle + (radPerSeg / 2);

      points.push(new Vector2(cx, cy));
      points.push(new Vector2(cx + R_INNER * Math.cos(startAngle), cy + R_INNER * Math.sin(startAngle)));
      points.push(new Vector2(cx + R_OUTER * Math.cos(midAngle), cy + R_OUTER * Math.sin(midAngle)));
      points.push(new Vector2(cx + R_INNER * Math.cos(endAngle), cy + R_INNER * Math.sin(endAngle)));
    }

    for (let j = 0; j < points.length; j++) {
      const P = ArrayHelper.strictGet(points, j);
      const P_prev = ArrayHelper.strictGet(points, (j - 1 + points.length) % points.length);
      const P_next = ArrayHelper.strictGet(points, (j + 1) % points.length);
      points[j] = calculateInsetVertex(P, P_prev, P_next, gapWidth);
    }

    let color;
    let rgb = { r: 0, g: 0, b: 0 };

    for (let visitIndex = 0; visitIndex < count; visitIndex++) {
      const t = ArrayHelper.strictGet(cellVisits, visitIndex);
      const normalizedT = t / maxOffset;
      const hue = MathHelper.slerp(startHue, endHue, normalizedT);
      const lightness = 0.1;
      const chroma = MathHelper.lerp(startChroma, endChroma, normalizedT);
      const visitColor = oklchToRgb(lightness, chroma, hue);
      rgb = addRgb(rgb, visitColor);
    }

    color = `rgb(${Math.round(rgb.r * 255)}, ${Math.round(rgb.g * 255)}, ${Math.round(rgb.b * 255)})`;

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