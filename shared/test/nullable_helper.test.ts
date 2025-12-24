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