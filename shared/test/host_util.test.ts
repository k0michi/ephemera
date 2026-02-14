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

  describe('parse', () => {
    it('should parse valid hosts', () => {
      expect(HostUtil.parse('example.com')).toEqual({ hostname: 'example.com', port: 443 });
      expect(HostUtil.parse('example.com:8080')).toEqual({ hostname: 'example.com', port: 8080 });
      expect(HostUtil.parse('localhost:3000')).toEqual({ hostname: 'localhost', port: 3000 });
      expect(HostUtil.parse('sub.example.com:1234')).toEqual({ hostname: 'sub.example.com', port: 1234 });
      expect(HostUtil.parse('[::1]:3000')).toEqual({ hostname: '[::1]', port: 3000 });
    });

    it('should throw on invalid hosts', () => {
      expect(() => HostUtil.parse(':8080')).toThrow();
      expect(() => HostUtil.parse('http://example.com:8080')).toThrow();
      expect(() => HostUtil.parse('https://example.com:8080')).toThrow();
    });
  });

  describe('stringify', () => {
    it('should stringify hosts correctly', () => {
      expect(HostUtil.stringify({ hostname: 'example.com', port: 443 })).toBe('example.com');
      expect(HostUtil.stringify({ hostname: 'example.com', port: 8080 })).toBe('example.com:8080');
      expect(HostUtil.stringify({ hostname: 'localhost', port: 3000 })).toBe('localhost:3000');
      expect(HostUtil.stringify({ hostname: 'sub.example.com', port: 1234 })).toBe('sub.example.com:1234');
      expect(HostUtil.stringify({ hostname: '[::1]', port: 3000 })).toBe('[::1]:3000');
    });

    it('should throw on invalid hosts', () => {
      expect(() => HostUtil.stringify({ hostname: 'example.com', port: -1 })).toThrow();
      expect(() => HostUtil.stringify({ hostname: 'example.com', port: 65536 })).toThrow();
      expect(() => HostUtil.stringify({ hostname: 'invalid host', port: 8080 })).toThrow();
    });
  });
});