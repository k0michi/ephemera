import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Config from '../app/config.js';

describe('Config', () => {
  it('should load configuration from environment variables', () => {
    vi.stubEnv('EPHEMERA_HOST', 'example.com');
    vi.stubEnv('EPHEMERA_PORT', '8080');
    vi.stubEnv('EPHEMERA_DB_HOST', 'dbhost');
    vi.stubEnv('EPHEMERA_DB_PORT', '3307');
    vi.stubEnv('EPHEMERA_DB_USER', 'dbuser');
    vi.stubEnv('EPHEMERA_DB_PASSWORD', 'dbpassword');
    vi.stubEnv('EPHEMERA_DB_NAME', 'dbname');
    vi.stubEnv('EPHEMERA_ALLOWED_TIME_SKEW_MILLIS', '600000');

    const config = Config.fromEnv();

    expect(config.host).toBe('example.com');
    expect(config.port).toBe(8080);
    expect(config.dbHost).toBe('dbhost');
    expect(config.dbPort).toBe(3307);
    expect(config.dbUser).toBe('dbuser');
    expect(config.dbPassword).toBe('dbpassword');
    expect(config.dbName).toBe('dbname');
    expect(config.allowedTimeSkewMillis).toBe(600000);

    vi.unstubAllEnvs();
  });
});