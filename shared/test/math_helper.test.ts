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

  describe("lerp", () => {
    it("should perform linear interpolation", () => {
      expect(MathHelper.lerp(0, 1, 0.5)).toBe(0.5);
      expect(MathHelper.lerp(10, 20, 0.25)).toBe(12.5);
    });
  });

  describe("reflect", () => {
    it("should reflect values within the specified range", () => {
      expect(MathHelper.reflect(7, 0, 10)).toBe(7);
      expect(MathHelper.reflect(12, 0, 10)).toBe(8);
      expect(MathHelper.reflect(-1, 0, 10)).toBe(1);
      expect(MathHelper.reflect(25, 0, 10)).toBe(5);
      expect(MathHelper.reflect(0, 0, 0)).toBe(0);
    });
  });

  describe("clamp", () => {
    it("should clamp values within the specified range", () => {
      expect(MathHelper.clamp(5, 0, 10)).toBe(5);
      expect(MathHelper.clamp(-5, 0, 10)).toBe(0);
      expect(MathHelper.clamp(15, 0, 10)).toBe(10);
    });
  });

  describe("normalize", () => {
    it("should normalize values within the specified range", () => {
      expect(MathHelper.normalize(5, 0, 10)).toBe(0.5);
      expect(MathHelper.normalize(0, 0, 10)).toBe(0);
      expect(MathHelper.normalize(10, 0, 10)).toBe(1);
      expect(MathHelper.normalize(15, 0, 10)).toBe(1.5);
      expect(MathHelper.normalize(5, 5, 5)).toBe(0);
    });
  });
});