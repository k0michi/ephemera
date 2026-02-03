import { describe, it, expect } from "vitest";
import Vector2 from "../lib/vector2.js";

describe("Vector2", () => {
  describe("add", () => {
    it("should add two vectors", () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(3, 4);
      const result = Vector2.add(v1, v2);
      expect(result).toEqual(new Vector2(4, 6));
    });
  });

  describe("sub", () => {
    it("should subtract two vectors", () => {
      const v1 = new Vector2(5, 7);
      const v2 = new Vector2(2, 3);
      const result = Vector2.sub(v1, v2);
      expect(result).toEqual(new Vector2(3, 4));
    });
  });

  describe("mul", () => {
    it("should multiply vector by scalar", () => {
      const v = new Vector2(2, 3);
      const s = 4;
      const result = Vector2.mul(v, s);
      expect(result).toEqual(new Vector2(8, 12));
    });
  });

  describe("dot", () => {
    it("should compute dot product of two vectors", () => {
      const v1 = new Vector2(1, 2);
      const v2 = new Vector2(3, 4);
      const result = Vector2.dot(v1, v2);
      expect(result).toBe(11);
    });
  });

  describe("norm", () => {
    it("should normalize a vector", () => {
      const v = new Vector2(3, 4);
      const result = Vector2.norm(v);
      expect(result.x).toBeCloseTo(0.6);
      expect(result.y).toBeCloseTo(0.8);
    });

    it("should return zero vector when normalizing zero vector", () => {
      const v = new Vector2(0, 0);
      const result = Vector2.norm(v);
      expect(result).toEqual(new Vector2(0, 0));
    });
  });

  describe("angleBetween", () => {
    it("should compute angle between two vectors", () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(0, 1);
      const result = Vector2.angleBetween(v1, v2);
      expect(result).toBeCloseTo(Math.PI / 2);
    });

    it("should handle parallel vectors", () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(2, 0);
      const result = Vector2.angleBetween(v1, v2);
      expect(result).toBeCloseTo(0);
    });

    it("should handle anti-parallel vectors", () => {
      const v1 = new Vector2(1, 0);
      const v2 = new Vector2(-1, 0);
      const result = Vector2.angleBetween(v1, v2);
      expect(result).toBeCloseTo(Math.PI);
    });
  });
});