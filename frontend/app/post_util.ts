export class PostUtil {
  static _kMaxPostLength = 280;
  static _kForbiddenLetterRegex = /[\x00-\x09\x0b-\x1f\x7f\u0080-\u009f]/;
  static _kForbiddenLetterRegexGlobal = new RegExp(PostUtil._kForbiddenLetterRegex, 'g');

  /**
   * Calculates the weighted length of a string, counting
   * ASCII characters as 1 and non-ASCII characters as 2.
   */
  static weightedLength(string: string): number {
    let length = 0;

    for (const char of string) {
      length += char.charCodeAt(0) > 0xFF ? 2 : 1;
    }

    return length;
  }

  /**
   * Validates if the string is valid as a post.
   */
  static validate(string: string): boolean {
    if (this.weightedLength(string) > this._kMaxPostLength) {
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