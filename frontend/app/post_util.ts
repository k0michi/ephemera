import { eastAsianWidth } from 'get-east-asian-width';

export class PostUtil {
  static _kMinPostLength = 1;
  static _kMaxPostLength = 280;
  /**
   * U+0000 to U+001F, U+007F to U+009F
   */
  static _kForbiddenLetterRegex = /[\x00-\x09\x0b-\x1f\x7f\u0080-\u009f]/;
  static _kForbiddenLetterRegexGlobal = new RegExp(PostUtil._kForbiddenLetterRegex, 'g');

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

      length += segmentWidth;
    }

    return length;
  }

  /**
   * Validates if the string is valid as a post.
   */
  static validate(string: string): boolean {
    const length = this.weightedLength(string);

    if (length < this._kMinPostLength || length > this._kMaxPostLength) {
      return false;
    }

    if (this._kForbiddenLetterRegex.test(string)) {
      return false;
    }

    if (string !== string.normalize('NFC')) {
      return false;
    }

    return true;
  }

  /**
   * Sanitizes the string to be valid as a post.
   * Note that this does not guarantee the result is valid;
   * it may still exceed the maximum length.
   */
  static sanitize(string: string): string {
    let normalized = string.normalize('NFC');
    normalized = normalized.replaceAll(this._kForbiddenLetterRegexGlobal, '');
    return normalized;
  }
}