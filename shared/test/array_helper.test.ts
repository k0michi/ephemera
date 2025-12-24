import { describe, it, expect } from "vitest";
import ArrayHelper from "../lib/array_helper.js";

describe("ArrayHelper", () => {
  describe("strictGet", () => {
    it("should return the element at the given index", () => {
      const arr = [undefined, 20, 30];
      expect(ArrayHelper.strictGet(arr, 0)).toBe(undefined);
      expect(ArrayHelper.strictGet(arr, 2)).toBe(30);
    });

    it("should throw if index is out of bounds", () => {
      const arr = [1, 2, 3];
      expect(() => ArrayHelper.strictGet(arr, -1)).toThrow();
      expect(() => ArrayHelper.strictGet(arr, 3)).toThrow();
    });
  });

  describe("strictSet", () => {
    it("should set the element at the given index", () => {
      const arr = [1, 2, 3];
      ArrayHelper.strictSet(arr, 1, 42);
      expect(arr[1]).toBe(42);
    });

    it("should throw if index is out of bounds", () => {
      const arr = [1, 2, 3];
      expect(() => ArrayHelper.strictSet(arr, -1, 99)).toThrow();
      expect(() => ArrayHelper.strictSet(arr, 3, 99)).toThrow();
    });
  });
});