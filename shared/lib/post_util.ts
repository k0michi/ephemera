import { eastAsianWidth } from 'get-east-asian-width';

export default class PostUtil {
  static kMinPostLength = 0;
  static kMaxPostLength = 320;
  /**
   * U+0000 to U+001F, U+007F to U+009F
   */
  static _kForbiddenCharactersRegex = /[\x00-\x09\x0b-\x1f\x7f\u0080-\u009f]/;
  static _kForbiddenCharactersRegexGlobal = new RegExp(PostUtil._kForbiddenCharactersRegex, 'g');

  private static getSegmentWidth(segment: string): number {
    const codePoints = Array.from(segment);
    let segmentWidth = 0;

    // Take the maximum width in the grapheme cluster
    for (const cp of codePoints) {
      const codePointValue = cp.codePointAt(0);

      if (codePointValue === undefined) {
        // Should not happen...
        continue;
      }

      segmentWidth = Math.max(eastAsianWidth(codePointValue), segmentWidth);
    }

    return segmentWidth;
  }

  /**
   * Calculates the weighted length of the string.
   * A character's weight is determined by its East Asian Width property:
   * - Fullwidth (F), Wide (W): 2
   * - Ambiguous (A), Halfwidth (H), Narrow (Na), Neutral (N): 1
   */
  static weightedLength(string: string): number {
    let length = 0;
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

    for (const { segment } of segmenter.segment(string)) {
      length += this.getSegmentWidth(segment);
    }

    return length;
  }

  /**
   * Returns a substring of the input string that does not exceed the specified weighted length.
   */
  static weightedSubstring(string: string, start: number = 0, end: number = Infinity): string {
    let currentWeight = 0;
    let result = '';
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

    for (const { segment } of segmenter.segment(string)) {
      const segmentWidth = this.getSegmentWidth(segment);

      const segmentEndWeight = currentWeight + segmentWidth;

      if (currentWeight >= start && segmentEndWeight <= end) {
        result += segment;
      }

      currentWeight = segmentEndWeight;

      if (currentWeight >= end) {
        break;
      }
    }

    return result;
  }

  /**
   * Validates if the string is valid as a post.
   */
  static validate(string: string): [boolean, string] {
    const length = this.weightedLength(string);

    if (length < this.kMinPostLength || length > this.kMaxPostLength) {
      return [false, "Invalid length"];
    }

    if (this._kForbiddenCharactersRegex.test(string)) {
      return [false, "Contains forbidden characters"];
    }

    if (string !== string.normalize('NFC')) {
      return [false, "Not normalized"];
    }

    return [true, ''];
  }

  /**
   * Sanitizes the string to be valid as a post.
   * Note that this does not guarantee the result is valid;
   * it may still exceed the maximum length.
   */
  static sanitize(string: string): string {
    let normalized = string.normalize('NFC');
    normalized = normalized.replaceAll(this._kForbiddenCharactersRegexGlobal, '');
    return normalized;
  }
}