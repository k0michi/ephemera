import Base37 from "./base37.js";
import { z } from "zod";

export type PostCursor = [string, string]; // [inserted_at, id]
const postCursorSchema = z.tuple([
  z.string(), // inserted_at
  z.string(), // id
]);

export class PostCursorUtil {
  static stringify(cursor: PostCursor): string {
    const json = JSON.stringify(cursor);
    const utf8 = new TextEncoder().encode(json);
    return Base37.fromUint8Array(utf8);
  }

  static parse(cursor: string): PostCursor {
    try {
      const utf8 = Base37.toUint8Array(cursor);
      const json = new TextDecoder().decode(utf8);
      const parsed = postCursorSchema.parse(JSON.parse(json));
      return parsed;
    } catch (e) {
      throw new Error('Invalid cursor');
    }
  }
}