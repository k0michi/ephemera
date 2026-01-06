export default class Hex {
  static fromUint8Array(buffer: Uint8Array): string {
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  static toUint8Array(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
      throw new Error('Invalid hex string');
    }

    const bytes = new Uint8Array(hex.length / 2);

    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }

    return bytes;
  }

  static isValid(hex: string): boolean {
    return /^[0-9a-fA-F]*$/.test(hex) && hex.length % 2 === 0;
  }
}