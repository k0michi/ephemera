import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Config from '../app/config.js';
import Crypto from '@ephemera/shared/lib/crypto.js';
import Base37 from '@ephemera/shared/lib/base37.js';

describe('Config', () => {
  it('should load configuration from environment variables', () => {
    const keyPair = Crypto.generateKeyPair();

    vi.stubEnv('EPHEMERA_HOST', 'example.com');
    vi.stubEnv('EPHEMERA_PORT', '8080');
    vi.stubEnv('EPHEMERA_DB_HOST', 'dbhost');
    vi.stubEnv('EPHEMERA_DB_PORT', '3307');
    vi.stubEnv('EPHEMERA_DB_USER', 'dbuser');
    vi.stubEnv('EPHEMERA_DB_PASSWORD', 'dbpassword');
    vi.stubEnv('EPHEMERA_DB_NAME', 'dbname');
    vi.stubEnv('EPHEMERA_PEER_HOST', 'peer:50051');
    vi.stubEnv('EPHEMERA_ALLOWED_TIME_SKEW_MILLIS', '600000');
    vi.stubEnv('EPHEMERA_PRIVATE_KEY', Base37.fromUint8Array(keyPair.privateKey));
    vi.stubEnv('EPHEMERA_PUBLIC_KEY', Base37.fromUint8Array(keyPair.publicKey));

    const config = Config.fromEnv();

    expect(config.host).toBe('example.com');
    expect(config.port).toBe(8080);
    expect(config.dbHost).toBe('dbhost');
    expect(config.dbPort).toBe(3307);
    expect(config.dbUser).toBe('dbuser');
    expect(config.dbPassword).toBe('dbpassword');
    expect(config.dbName).toBe('dbname');
    expect(config.peerHost).toBe('peer:50051');
    expect(config.allowedTimeSkewMillis).toBe(600000);
    expect(config.privateKey).toBe(Base37.fromUint8Array(keyPair.privateKey));
    expect(config.publicKey).toBe(Base37.fromUint8Array(keyPair.publicKey));
    vi.unstubAllEnvs();
  });
});