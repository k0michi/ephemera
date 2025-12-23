import { describe, it, expect } from "vitest";
import { PostUtil } from "../app/post_util";

describe("PostUtil.weightedLength", () => {
  it("counts ASCII as 1, non-ASCII as 2", () => {
    expect(PostUtil.weightedLength("abc")).toBe(3);
    expect(PostUtil.weightedLength("あいう")).toBe(6);
    expect(PostUtil.weightedLength("aあb")).toBe(4);
  });
});

describe("PostUtil.validate", () => {
  it("returns false if over max length", () => {
    const long = "a".repeat(281);
    expect(PostUtil.validate(long)).toBe(false);
  });

  it("returns false if forbidden chars present", () => {
    expect(PostUtil.validate("abc\x00def")).toBe(false);
    expect(PostUtil.validate("abc\x7fdef")).toBe(false);
  });

  it("returns false if not NFC normalized", () => {
    expect(PostUtil.validate("è".normalize("NFD"))).toBe(false);
  });

  it("returns true for valid post", () => {
    expect(PostUtil.validate("Hello world!".normalize("NFC"))).toBe(true);
  });
});

describe("PostUtil.normalize", () => {
  it("should NFC normalize the string", () => {
    expect(PostUtil.sanitize("è".normalize("NFD"))).toBe("è".normalize("NFC"));
  });

  it("should remove forbidden characters", () => {
    expect(PostUtil.sanitize("abc\x00def\x7fghi")).toBe("abcdefghi");
  });

  it("should not throw for valid string", () => {
    expect(() => PostUtil.sanitize("hello world")).not.toThrow();
  });
});