import { describe, expect, it } from "vitest";
import PromiseHelper from "../lib/promise_helper.js";

describe('PromiseHelper', () => {
  describe('then', () => {
    it('should apply function to non-promise value', () => {
      const value = 5;
      const result = PromiseHelper.then(value, (x) => x * 2);
      expect(result).toBe(10);
    });

    it('should apply function to resolved promise value', async () => {
      const valuePromise = Promise.resolve(5);
      const result = PromiseHelper.then(valuePromise, (x) => x * 2);
      expect(result).toBeInstanceOf(Promise);
      const resolvedResult = await result;
      expect(resolvedResult).toBe(10);
    });
  });

  describe('tap', () => {
    it('should call function with non-promise value and return the value', () => {
      const value = 5;
      let tappedValue: number | null = null;
      const result = PromiseHelper.tap(value, (x) => { tappedValue = x; });
      expect(tappedValue).toBe(5);
      expect(result).toBe(5);
    });

    it('should call function with resolved promise value and return the value', async () => {
      const valuePromise = Promise.resolve(5);
      let tappedValue: number | null = null;
      const result = PromiseHelper.tap(valuePromise, (x) => { tappedValue = x; });
      expect(result).toBeInstanceOf(Promise);
      const resolvedResult = await result;
      expect(tappedValue).toBe(5);
      expect(resolvedResult).toBe(5);
    });
  });
});