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

  it('should retrieve mandatory string variable', () => {
    process.env.TEST_STRING = 'hello';
    const parser = new EnvParser(process.env);
    const value = parser.getStringRequired('TEST_STRING');
    expect(value).toBe('hello');
  });

  it('should throw error for missing mandatory string variable', () => {
    const parser = new EnvParser(process.env);
    expect(() => parser.getStringRequired('MISSING_STRING')).toThrowError('Environment variable MISSING_STRING is not set');
  });

  it('should retrieve mandatory number variable', () => {
    process.env.TEST_NUMBER = '42';
    const parser = new EnvParser(process.env);
    const value = parser.getNumberRequired('TEST_NUMBER');
    expect(value).toBe(42);
  });

  it('should throw error for missing mandatory number variable', () => {
    const parser = new EnvParser(process.env);
    expect(() => parser.getNumberRequired('MISSING_NUMBER')).toThrowError('Environment variable MISSING_NUMBER is not set');
  });

  it('should throw error for invalid mandatory number variable', () => {
    process.env.INVALID_NUMBER = 'not_a_number';
    const parser = new EnvParser(process.env);
    expect(() => parser.getNumberRequired('INVALID_NUMBER')).toThrowError('Environment variable INVALID_NUMBER is not a valid number');
  });

  it('should retrieve optional string variable with default', () => {
    const parser = new EnvParser(process.env);
    const value = parser.getStringOptional('OPTIONAL_STRING', 'default_value');
    expect(value).toBe('default_value');
  });

  it('should retrieve optional number variable with default', () => {
    const parser = new EnvParser(process.env);
    const value = parser.getNumberOptional('OPTIONAL_NUMBER', 99);
    expect(value).toBe(99);
  });

  it('should return parsed optional number variable', () => {
    process.env.OPTIONAL_NUMBER = '123';
    const parser = new EnvParser(process.env);
    const value = parser.getNumberOptional('OPTIONAL_NUMBER', 99);
    expect(value).toBe(123);
  });

  it('should return default for invalid optional number variable', () => {
    process.env.OPTIONAL_NUMBER = 'invalid_number';
    const parser = new EnvParser(process.env);
    const value = parser.getNumberOptional('OPTIONAL_NUMBER', 99);
    expect(value).toBe(99);
  });
});