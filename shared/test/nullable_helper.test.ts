import { describe, it, expect } from "vitest";
import NullableHelper from "../lib/nullable_helper.js";

describe("NullableHelper.unwrap", () => {
  it("should return the value if not null or undefined", () => {
    expect(NullableHelper.unwrap(42)).toBe(42);
    expect(NullableHelper.unwrap("hello")).toBe("hello");
    expect(NullableHelper.unwrap(false)).toBe(false);
    expect(NullableHelper.unwrap(0)).toBe(0);
  });

  it("should throw if value is null", () => {
    expect(() => NullableHelper.unwrap(null)).toThrow();
  });

  it("should throw if value is undefined", () => {
    expect(() => NullableHelper.unwrap(undefined)).toThrow();
  });
});

describe("NullableHelper.map", () => {
  it("should apply the function if value is not null or undefined", () => {
    expect(NullableHelper.map(2, x => x * 3)).toBe(6);
    expect(NullableHelper.map("foo", s => s.toUpperCase())).toBe("FOO");
  });

  it("should return null if value is null", () => {
    expect(NullableHelper.map(null, x => x)).toBeNull();
  });

  it("should return undefined if value is undefined", () => {
    expect(NullableHelper.map(undefined, x => x)).toBeUndefined();
  });
});