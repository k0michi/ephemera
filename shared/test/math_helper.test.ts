import { describe, it, expect } from "vitest";
import MathHelper from "../lib/math_helper.js";

describe("MathHelper", () => {
  describe("floorMod", () => {
    it("should handle positive numbers", () => {
      expect(MathHelper.floorMod(5, 3)).toBe(2);
      expect(MathHelper.floorMod(-1, 3)).toBe(2);
    });

    it("should handle zero modulus", () => {
      expect(MathHelper.floorMod(5, 0)).toBe(NaN);
    });

    it("should handle negative modulus", () => {
      expect(MathHelper.floorMod(5, -3)).toBe(-1);
      expect(MathHelper.floorMod(-1, -3)).toBe(-1);
      expect(MathHelper.floorMod(-4, -3)).toBe(-1);
    });
  });

  describe("slerp", () => {
    it("should interpolate angles correctly", () => {
      expect(MathHelper.slerp(30, 90, 0.5)).toBe(60);
      expect(MathHelper.slerp(90, 0, 0.5)).toBe(45);
      expect(MathHelper.slerp(0, 270, 0.5)).toBe(315);
    });
  });
});