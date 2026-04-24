import { describe, it, expect } from "vitest";
import PostUtil from "../lib/post_util.js";

describe("PostUtil.weightedLength", () => {
  it("counts based on East_Asian_Width", () => {
    expect(PostUtil.weightedLength("abc")).toBe(3);
    expect(PostUtil.weightedLength("あいう")).toBe(6);
    expect(PostUtil.weightedLength("aあb")).toBe(4);
    expect(PostUtil.weightedLength("𠮷野家")).toBe(6);
    expect(PostUtil.weightedLength("😃")).toBe(2);
    expect(PostUtil.weightedLength("🧑‍🧑‍🧒")).toBe(2);
  });
});

describe("PostUtil.weightedSubstring", () => {
  it("returns substring based on weighted length", () => {
    expect(PostUtil.weightedSubstring("abc", 0, 2)).toBe("ab");
    expect(PostUtil.weightedSubstring("abc", 1, 3)).toBe("bc");
    expect(PostUtil.weightedSubstring("あいう", 0, 4)).toBe("あい");
    expect(PostUtil.weightedSubstring("あいう", 2, 6)).toBe("いう");
    expect(PostUtil.weightedSubstring("あいう", 3, 6)).toBe("う");
    expect(PostUtil.weightedSubstring("あいう", 3, 5)).toBe("");
    expect(PostUtil.weightedSubstring("aあb", 0, 3)).toBe("aあ");
    expect(PostUtil.weightedSubstring("𠮷野家", 0, 4)).toBe("𠮷野");
    expect(PostUtil.weightedSubstring("😃", 0, 1)).toBe("");
    expect(PostUtil.weightedSubstring("😃", 0, 2)).toBe("😃");
    expect(PostUtil.weightedSubstring("🧑‍🧑‍🧒", 0, 1)).toBe("");
    expect(PostUtil.weightedSubstring("🧑‍🧑‍🧒", 0, 2)).toBe("🧑‍🧑‍🧒");
  });
});

describe("PostUtil.validate", () => {
  it("returns false if over max length", () => {
    const long = "a".repeat(PostUtil.kMaxPostLength + 1);
    expect(PostUtil.validate(long)[0]).toBe(false);
  });

  it("returns false if forbidden chars present", () => {
    expect(PostUtil.validate("abc\x00def")[0]).toBe(false);
    expect(PostUtil.validate("abc\x7fdef")[0]).toBe(false);
  });

  it("returns false if not NFC normalized", () => {
    expect(PostUtil.validate("è".normalize("NFD"))[0]).toBe(false);
  });

  it("returns true for valid post", () => {
    expect(PostUtil.validate("Hello world!".normalize("NFC"))[0]).toBe(true);
    expect(PostUtil.validate("".normalize("NFC"))[0]).toBe(true);
  });
});

describe("PostUtil.sanitize", () => {
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