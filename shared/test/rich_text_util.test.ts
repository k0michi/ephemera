import { describe, expect, it } from "vitest";
import RichTextUtil from "../lib/rich_text_util.js";
import type { RichTextNode } from "../api/api.js";

describe("RichTextUtil", () => {
  describe("getAttributes", () => {
    it("should return the attributes of a rich text element", () => {
      const element: RichTextNode = ["anchor", [["alt", "a"], ["alt", "b"]], []];
      const alts = RichTextUtil.getAttributes(element, "alt");
      expect(alts).toEqual(["a", "b"]);
    });
  });

  describe("toPlainText", () => {
    it("should convert rich text to plain text", () => {
      const richText: RichTextNode[] = [
        "Hello, ",
        ["bold", [], ["world"]],
        "! This is a ",
        ["italic", [], ["test"]],
        ". ",
        ["strikethrough", [], ["This should be strikethrough."]],
        " ",
        ["anchor", [["url", "https://example.com"], ["alt", "https://example.com"]], []],
      ];

      const plainText = RichTextUtil.toPlainText(richText);
      expect(plainText).toBe(
        "Hello, world! This is a test. This should be strikethrough. https://example.com"
      );
    });
  });
});