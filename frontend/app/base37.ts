/**
 * Base37 encoding and decoding utility.
 * 
 * This base37 implementation uses the character set:
 * '0123456789abcdefghijklmnopqrstuvwxyz_',
 * which is the set of characters used in Twitter.
 * 
 * @see https://github.com/bitcoin/bitcoin/blob/master/src/base58.cpp
 */
export default class Base37 {
  private static readonly ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz_';
  private static readonly BASE = 37n;
  private static readonly LEADER = Base37.ALPHABET[0]; // '0'

  public static fromUint8Array(buffer: Uint8Array): string {
    if (buffer.length === 0) return '';

    // Count leading zeros for preserving them
    let zeros = 0;
    while (zeros < buffer.length && buffer[zeros] === 0) {
      zeros++;
    }

    let value = 0n;
    for (let i = zeros; i < buffer.length; i++) {
      value = (value * 256n) + BigInt(buffer[i]);
    }

    let encoded = '';
    while (value > 0n) {
      const remainder = Number(value % Base37.BASE);
      encoded = Base37.ALPHABET[remainder] + encoded;
      value /= Base37.BASE;
    }

    return Base37.LEADER.repeat(zeros) + encoded;
  }

  public static toUint8Array(str: string): Uint8Array {
    if (str.length === 0) return new Uint8Array(0);

    const input = str.toLowerCase();

    let zeros = 0;
    while (zeros < input.length && input[zeros] === Base37.LEADER) {
      zeros++;
    }

    let value = 0n;
    for (let i = zeros; i < input.length; i++) {
      const char = input[i];
      const index = Base37.ALPHABET.indexOf(char);

      if (index === -1) {
        throw new Error(`Invalid character for Base37: "${char}"`);
      }

      value = value * Base37.BASE + BigInt(index);
    }

    const bytes: number[] = [];

    while (value > 0n) {
      bytes.unshift(Number(value % 256n));
      value /= 256n;
    }

    const result = new Uint8Array(zeros + bytes.length);
    result.set(bytes, zeros);

    return result;
  }
}