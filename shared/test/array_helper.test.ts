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

  describe("equals", () => {
    it("should return true for equal arrays", () => {
      expect(ArrayHelper.equals([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(ArrayHelper.equals([], [])).toBe(true);
      expect(ArrayHelper.equals(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it("should return false for non-equal arrays", () => {
      expect(ArrayHelper.equals([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(ArrayHelper.equals([1, 2], [1, 2, 3])).toBe(false);
      expect(ArrayHelper.equals(['a', 'b'], ['a', 'c'])).toBe(false);
    });
  });
});