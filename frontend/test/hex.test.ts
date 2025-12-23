import { describe } from "node:test";
import { expect, it } from "vitest";
import Hex from "~/hex";

describe('Hex', () => {
  describe('fromUint8Array', () => {
    it('should convert Uint8Array to hex string correctly', () => {
      const buffer = new Uint8Array([0x0, 0x0f, 0x10, 0xff]);
      const hexString = Hex.fromUint8Array(buffer);
      expect(hexString).toBe('000f10ff');
    });
  });

  describe('toUint8Array', () => {
    it('should convert hex string to Uint8Array correctly', () => {
      const hexString = '000f10ff';
      const buffer = Hex.toUint8Array(hexString);
      expect(buffer).toEqual(new Uint8Array([0x0, 0x0f, 0x10, 0xff]));
    });

    it('should throw an error for invalid hex string', () => {
      const invalidHexString = '000f10f'; // Odd length
      expect(() => Hex.toUint8Array(invalidHexString)).toThrow('Invalid hex string');
    });
  });
});