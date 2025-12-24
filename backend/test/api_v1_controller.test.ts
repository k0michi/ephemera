import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import ApiV1Controller from '../app/api_v1_controller.js';
import type { PostRequest } from '@ephemera/shared/api/api.js';
import Config from '../app/config.js';

function testConfig() {
  return new Config({ host: 'example.com', port: 3000 });
}

describe('ApiV1Controller', () => {
  describe('handlePost', () => {
    it('should respond with 400 for invalid request body', async () => {
      const req = createRequest({
        method: 'POST',
        url: '/api/v1/post',
        body: { invalid: 'data' },
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config);
      await controller.handlePost(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty('error', 'Invalid request');
    });

    it('should respond with 400 for invalid post signature', async () => {
      const req = createRequest({
        method: 'POST',
        url: '/api/v1/post',
        body: {
          post: [[0, ['host', 'invalid_public_key', 0, 'create_post'], 'body text', []], '0'.repeat(64)],
        } satisfies PostRequest,
      });
      const res = createResponse();

      const config = testConfig();

      const controller = new ApiV1Controller(config);
      await controller.handlePost(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty('error', 'Invalid signature');
    });
  });
});