import { describe, expect, it } from "vitest";
import HostUtil from "../lib/host_util.js";

describe('HostUtil', () => {
  describe('isValid', () => {
    it('should validate valid hosts', () => {
      expect(HostUtil.isValid('example.com')).toBe(true);
      expect(HostUtil.isValid('example.com:8080')).toBe(true);
      expect(HostUtil.isValid('localhost:3000')).toBe(true);
      expect(HostUtil.isValid('sub.example.com:1234')).toBe(true);
      expect(HostUtil.isValid('[::1]:3000')).toBe(true);
      expect(HostUtil.isValid('example.com:443')).toBe(true);
    });

    it('should invalidate invalid hosts', () => {
      expect(HostUtil.isValid(':8080')).toBe(false);
      expect(HostUtil.isValid('http://example.com:8080')).toBe(false);
      expect(HostUtil.isValid('https://example.com:8080')).toBe(false);
      expect(HostUtil.isValid('user:pass@example.com:8080')).toBe(false);
    });
  });
});