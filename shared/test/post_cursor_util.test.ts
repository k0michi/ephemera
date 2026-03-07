import { describe, expect, it } from "vitest";
import { PostCursorUtil } from "../lib/post_cursor_util.js";
import TestHelper from "./test_helper.js";

describe('PostCursorUtil', () => {
  it('should round-trip correctly', () => {
    const cursor: [string, string] = ['2026-03-07 12:22:06.123456', TestHelper.base37('test')];
    const str = PostCursorUtil.stringify(cursor);
    const parsed = PostCursorUtil.parse(str);
    expect(parsed).toEqual(cursor);
  });
});