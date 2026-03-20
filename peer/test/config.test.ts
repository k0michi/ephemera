import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Config from '../app/config.js';

describe('Config', () => {
  it('should load configuration from environment variables', () => {
    vi.stubEnv('EPHEMERA_INTERNAL_HOST', 'example.com:8080');
    vi.stubEnv('EPHEMERA_EXTERNAL_HOST', 'external.com:443');
    vi.stubEnv('EPHEMERA_PRIVATE_KEY', 'private_key');
    vi.stubEnv('EPHEMERA_PUBLIC_KEY', 'public_key');
    vi.stubEnv('EPHEMERA_BOOTSTRAP_PEERS', '/dns4/localhost/tcp/3000/wss/p2p/12D3KooWJfvkMMY3WV2bahfE17LWEa7DNpxiTWnvRoy3aXFD8xbm');

    const config = Config.fromEnv();

    expect(config.internalHost).toBe('example.com:8080');
    expect(config.externalHost).toBe('external.com:443');
    expect(config.privateKey).toBe('private_key');
    expect(config.publicKey).toBe('public_key');
    expect(config.bootstrapPeers).toEqual(['/dns4/localhost/tcp/3000/wss/p2p/12D3KooWJfvkMMY3WV2bahfE17LWEa7DNpxiTWnvRoy3aXFD8xbm']);

    vi.unstubAllEnvs();
  });
});