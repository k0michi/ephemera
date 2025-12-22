import { describe } from "node:test";
import { expect, it } from "vitest";
import Base37 from "~/base37"

function* xorShift32(seed: number): Generator<number> {
  let x = seed;
  while (true) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    yield x >>> 0;
  }
}

function randomBytes(length: number, rand: Generator<number>): Uint8Array {
  const buffer = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.floor(rand.next().value % 256);
  }
  return buffer;
}

describe('Base37', () => {
  describe('fromUint8Array', () => {
    it('should encode Uint8Array to Base37 string correctly', () => {
      let buffer = new Uint8Array([0]);
      let encoded = Base37.fromUint8Array(buffer);
      expect(encoded).toBe('0');

      buffer = new Uint8Array([0, 0, 1]);
      encoded = Base37.fromUint8Array(buffer);
      expect(encoded).toBe('001');

      buffer = new Uint8Array([37]);
      encoded = Base37.fromUint8Array(buffer);
      expect(encoded).toBe('10');

      buffer = new Uint8Array([37 * 2]);
      encoded = Base37.fromUint8Array(buffer);
      expect(encoded).toBe('20');
    });

    it('should round-trip encode and decode correctly', () => {
      const original = new Uint8Array([0, 0, 1, 2, 3, 4, 5, 255]);
      const encoded = Base37.fromUint8Array(original);
      const decoded = Base37.toUint8Array(encoded);
      expect(decoded).toEqual(original);
    });
  });

  it('should round-trip random bytes with many seeds', () => {
    for (let seed = 0; seed < 100; seed++) {
      const rand = xorShift32(seed);
      const arr = randomBytes(64, rand);
      const encoded = Base37.fromUint8Array(arr);
      const decoded = Base37.toUint8Array(encoded);
      expect(decoded).toEqual(arr);
    }
  });
});
