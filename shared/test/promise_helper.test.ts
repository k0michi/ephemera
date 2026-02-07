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
});