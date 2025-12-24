import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import ApiV1Controller from '../app/api_v1_controller.js';

describe('ApiV1Controller', () => {
  let controller: ApiV1Controller;

  beforeEach(() => {
    controller = new ApiV1Controller();
  });

  describe('handlePost', () => {
    it('should respond with 400 for invalid request body', async () => {
      const req = createRequest({
        method: 'POST',
        url: '/api/v1/post',
        body: { invalid: 'data' },
      });
      const res = createResponse();

      await controller.handlePost(req, res);
      expect(res.statusCode).toBe(400);
      const data = res._getJSONData();
      expect(data).toHaveProperty('error', 'Invalid request');
    });
  });
});