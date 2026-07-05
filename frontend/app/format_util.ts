import NullableHelper from "@ephemera/shared/lib/nullable_helper";

export default class FormatUtil {
  static formatNumber(value: number, decimalPlaces?: number): string {
    const num = typeof value === 'string' ? Number(value) : value;

    if (Number.isNaN(num)) {
      throw new TypeError(`Invalid number: ${value}`);
    }

    const fixed = decimalPlaces !== undefined ? num.toFixed(decimalPlaces) : num.toString();
    let [integerPart, decimalPart] = fixed.split('.');
    integerPart = NullableHelper.unwrap(integerPart);

    const sign = integerPart.startsWith('-') ? '-' : '';
    const digits = sign ? integerPart.slice(1) : integerPart;

    const chunks: string[] = [];
    for (let end = digits.length; end > 0; end -= 3) {
      const start = Math.max(0, end - 3);
      chunks.unshift(digits.slice(start, end));
    }
    const withComma = chunks.join(',');

    return sign + withComma + (decimalPart ? '.' + decimalPart : '');
  }
}