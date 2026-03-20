import Base37 from "../lib/base37.js";

export default class TestHelper {
  static base37(input: string): string {
    const encoder = new TextEncoder();
    const utf8 = encoder.encode(input);
    return Base37.fromUint8Array(utf8);
  }
}