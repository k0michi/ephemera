import ArrayHelper from "@ephemera/shared/lib/array_helper";
import MathHelper from "@ephemera/shared/lib/math_helper";

export type Cell = number[];

export default class DrunkenBishop {
  static compute2DReflect(data: Uint8Array, width: number, height: number): Cell[] {
    const grid: Cell[] = Array(width * height).fill(null).map(() => []);
    let x = Math.floor(width / 2);
    let y = Math.floor(height / 2);

    ArrayHelper.strictGet(grid, y * width + x).push(0);
    for (let i = 0; i < data.length; i++) {
      const byte = ArrayHelper.strictGet(data, i);

      for (let step = 0; step < 4; step++) {
        const pair = (byte >> (2 * step)) & 0x03;

        const dx = (pair & 0x01) ? 1 : -1;
        const dy = (pair & 0x02) ? 1 : -1;

        x = MathHelper.reflect(x + dx, 0, width - 1);
        y = MathHelper.reflect(y + dy, 0, height - 1);

        ArrayHelper.strictGet(grid, y * width + x).push(i * 4 + step + 1);
      }
    }

    return grid;
  }

  static computeLooped1D(data: Uint8Array, width: number): Cell[] {
    const grid: Cell[] = Array(width).fill(null).map(() => []);
    let x = 0;

    ArrayHelper.strictGet(grid, x).push(0);
    for (let i = 0; i < data.length; i++) {
      const byte = ArrayHelper.strictGet(data, i);

      for (let step = 0; step < 8; step++) {
        const bit = (byte >> step) & 0x01;
        const dx = bit ? 1 : -1;

        x = MathHelper.floorMod(x + dx, width);

        ArrayHelper.strictGet(grid, x).push(i * 8 + step + 1);
      }
    }

    return grid;
  }
}