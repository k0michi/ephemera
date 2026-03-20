import { describe, expect, it } from "vitest";
import DateTimeUtil from "../lib/date_time_util.js";
import { Temporal } from "@js-temporal/polyfill";

describe('DateTimeUtil', () => {
  describe('fromMySQLString', () => {
    it('should parse valid datetime string', () => {
      const str = '2026-03-07 12:22:06.123456';
      const instant = DateTimeUtil.fromMySQLString(str);
      expect(instant.toString()).toBe('2026-03-07T12:22:06.123456Z');
    });

    it('should throw on invalid datetime string', () => {
      expect(() => DateTimeUtil.fromMySQLString('invalid')).toThrow();
      expect(() => DateTimeUtil.fromMySQLString('2026-03-07')).toThrow();
      expect(() => DateTimeUtil.fromMySQLString('2026-03-07T12:22:06Z')).toThrow();
      expect(() => DateTimeUtil.fromMySQLString('2026-03-07T12:22:06')).toThrow();
      expect(() => DateTimeUtil.fromMySQLString('999-03-07T12:22:06')).toThrow();
    });
  });

  describe('toMySQLString', () => {
    it('should format Temporal.Instant correctly', () => {
      const instant = DateTimeUtil.fromMySQLString('2026-03-07 12:22:06.123456');
      const str = DateTimeUtil.toMySQLString(instant);
      expect(str).toBe('2026-03-07 12:22:06.123456');
    });

    it('should throw on invalid year', () => {
      expect(() => DateTimeUtil.toMySQLString(Temporal.Instant.from('+020000-01-01T00:00:00Z'))).toThrow();
      expect(() => DateTimeUtil.toMySQLString(Temporal.Instant.from('-000001-01-01T00:00:00Z'))).toThrow();
    });
  });
});