import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import EnvParser from '../app/env_parser.js';

describe('EnvParser', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getStringRequired', () => {
    it('should return the string value when the environment variable is set', () => {
      process.env.TEST_STRING = 'test_value';
      const parser = new EnvParser(process.env);
      const value = parser.getStringRequired('TEST_STRING');
      expect(value).toBe('test_value');
    });

    it('should throw an error when the environment variable is not set', () => {
      const parser = new EnvParser(process.env);
      expect(() => parser.getStringRequired('MISSING_STRING')).toThrowError('Environment variable MISSING_STRING is not set');
    });
  });

  describe('getNumberRequired', () => {
    it('should return the number value when the environment variable is set and valid', () => {
      process.env.TEST_NUMBER = '42';
      const parser = new EnvParser(process.env);
      const value = parser.getNumberRequired('TEST_NUMBER');
      expect(value).toBe(42);
    });

    it('should throw an error when the environment variable is not set', () => {
      const parser = new EnvParser(process.env);
      expect(() => parser.getNumberRequired('MISSING_NUMBER')).toThrowError('Environment variable MISSING_NUMBER is not set');
    });

    it('should throw an error when the environment variable is not a valid number', () => {
      process.env.INVALID_NUMBER = 'not_a_number';
      const parser = new EnvParser(process.env);
      expect(() => parser.getNumberRequired('INVALID_NUMBER')).toThrowError('Environment variable INVALID_NUMBER is not a valid number');
    });
  });

  describe('getStringOptional', () => {
    it('should return the string value when the environment variable is set', () => {
      process.env.OPTIONAL_STRING = 'optional_value';
      const parser = new EnvParser(process.env);
      const value = parser.getStringOptional('OPTIONAL_STRING', 'default_value');
      expect(value).toBe('optional_value');
    });

    it('should return the default value when the environment variable is not set', () => {
      const parser = new EnvParser(process.env);
      const value = parser.getStringOptional('MISSING_OPTIONAL_STRING', 'default_value');
      expect(value).toBe('default_value');
    });
  });

  describe('getNumberOptional', () => {
    it('should return the number value when the environment variable is set and valid', () => {
      process.env.OPTIONAL_NUMBER = '84';
      const parser = new EnvParser(process.env);
      const value = parser.getNumberOptional('OPTIONAL_NUMBER', 21);
      expect(value).toBe(84);
    });

    it('should return the default value when the environment variable is not set', () => {
      const parser = new EnvParser(process.env);
      const value = parser.getNumberOptional('MISSING_OPTIONAL_NUMBER', 21);
      expect(value).toBe(21);
    });

    it('should return the default value when the environment variable is not a valid number', () => {
      process.env.INVALID_OPTIONAL_NUMBER = 'not_a_number';
      const parser = new EnvParser(process.env);
      const value = parser.getNumberOptional('INVALID_OPTIONAL_NUMBER', 21);
      expect(value).toBe(21);
    });
  });
});