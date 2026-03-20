import { Temporal } from '@js-temporal/polyfill';

export default class DateTimeUtil {
  private static readonly MYSQL_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/;

  static fromMySQLString(string: string): Temporal.Instant {
    if (!this.MYSQL_REGEX.test(string)) {
      throw new Error(`Invalid MySQL datetime string: ${string}`);
    }

    try {
      const isoLike = string.replace(' ', 'T') + 'Z';
      return Temporal.Instant.from(isoLike);
    } catch (e) {
      throw new Error(`Invalid date: ${string}`);
    }
  }

  static toMySQLString(instant: Temporal.Instant, fractionalSecondDigits: 'auto' | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 = 6): string {
    const pdt = instant.toZonedDateTimeISO('UTC').toPlainDateTime();

    if (pdt.year < 1000 || pdt.year > 9999) {
      throw new Error(`Year out of range for MySQL datetime: ${pdt.year}`);
    }

    return pdt.toString({ fractionalSecondDigits }).replace('T', ' ');
  }
}