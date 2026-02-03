/**
 * Webhook Pipe Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { WebhookPipe, WebhookSender, createWebhookPipe } from '../webhook/index.js';
import type { WebhookPipeConfig, WebhookVerification } from '../types.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WebhookPipe', () => {
  describe('Creation', () => {
    it('should create a webhook pipe', () => {
      const pipe = createWebhookPipe({
        name: 'github-webhook',
        config: {
          type: 'webhook',
          path: '/webhooks/github',
        },
      });

      expect(pipe).toBeInstanceOf(WebhookPipe);
      expect(pipe.name).toBe('github-webhook');
      expect(pipe.type).toBe('webhook');
    });

    it('should always report as connected', () => {
      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/test',
        },
      });

      expect(pipe.isConnected()).toBe(true);
    });

    it('should return the configured path', () => {
      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/webhooks/test',
        },
      });

      expect(pipe.getPath()).toBe('/webhooks/test');
    });

    it('should return the configured method', () => {
      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/test',
          method: 'PUT',
        },
      });

      expect(pipe.getMethod()).toBe('PUT');
    });

    it('should default to POST method', () => {
      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/test',
        },
      });

      expect(pipe.getMethod()).toBe('POST');
    });
  });

  describe('Handler Registration', () => {
    it('should register webhook handlers', async () => {
      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/test',
        },
      });

      const handler = vi.fn();
      const unsubscribe = pipe.onWebhook(handler);

      await pipe.handleRequest({ event: 'push' }, {});

      expect(handler).toHaveBeenCalledWith({ event: 'push' }, {});
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unregister handlers', async () => {
      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/test',
        },
      });

      const handler = vi.fn();
      const unsubscribe = pipe.onWebhook(handler);

      unsubscribe();

      await pipe.handleRequest({ event: 'push' }, {});

      expect(handler).not.toHaveBeenCalled();
    });

    it('should call multiple handlers', async () => {
      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/test',
        },
      });

      const handler1 = vi.fn();
      const handler2 = vi.fn();
      pipe.onWebhook(handler1);
      pipe.onWebhook(handler2);

      await pipe.handleRequest({ data: 'test' }, {});

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Signature Verification', () => {
    // Test the signature verification logic directly
    const timingSafeEqual = (a: string, b: string): boolean => {
      if (a.length !== b.length) {
        return false;
      }
      let result = 0;
      for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
    };

    const verifyHmacSignature = (
      body: unknown,
      signature: string,
      secret: string,
      algorithm: string = 'sha256'
    ): boolean => {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      const expectedSignature = createHmac(algorithm, secret)
        .update(bodyString)
        .digest('hex');
      const cleanReceived = signature.replace(/^sha\d+=/, '');
      return timingSafeEqual(cleanReceived, expectedSignature);
    };

    it('should verify valid HMAC signature', () => {
      const body = { event: 'push' };
      const secret = 'my-secret-key';
      const signature = createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');

      expect(verifyHmacSignature(body, signature, secret)).toBe(true);
    });

    it('should verify signature with sha prefix', () => {
      const body = { event: 'push' };
      const secret = 'my-secret-key';
      const rawSignature = createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');
      const signature = `sha256=${rawSignature}`;

      expect(verifyHmacSignature(body, signature, secret)).toBe(true);
    });

    it('should reject invalid HMAC signature', () => {
      const body = { event: 'push' };
      const secret = 'my-secret-key';
      const wrongSignature = 'invalid-signature';

      expect(verifyHmacSignature(body, wrongSignature, secret)).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const body = { event: 'push' };
      const correctSecret = 'correct-secret';
      const wrongSecret = 'wrong-secret';
      const signature = createHmac('sha256', correctSecret)
        .update(JSON.stringify(body))
        .digest('hex');

      expect(verifyHmacSignature(body, signature, wrongSecret)).toBe(false);
    });

    it('should verify with different algorithms', () => {
      const body = { event: 'push' };
      const secret = 'my-secret-key';

      const sha1Sig = createHmac('sha1', secret)
        .update(JSON.stringify(body))
        .digest('hex');
      expect(verifyHmacSignature(body, sha1Sig, secret, 'sha1')).toBe(true);

      const sha512Sig = createHmac('sha512', secret)
        .update(JSON.stringify(body))
        .digest('hex');
      expect(verifyHmacSignature(body, sha512Sig, secret, 'sha512')).toBe(true);
    });

    it('should handle string body', () => {
      const body = 'plain text body';
      const secret = 'my-secret-key';
      const signature = createHmac('sha256', secret)
        .update(body)
        .digest('hex');

      expect(verifyHmacSignature(body, signature, secret)).toBe(true);
    });
  });

  describe('Timing-Safe Comparison', () => {
    const timingSafeEqual = (a: string, b: string): boolean => {
      if (a.length !== b.length) {
        return false;
      }
      let result = 0;
      for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
    };

    it('should return true for equal strings', () => {
      expect(timingSafeEqual('abc', 'abc')).toBe(true);
      expect(timingSafeEqual('hello world', 'hello world')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(timingSafeEqual('abc', 'def')).toBe(false);
      expect(timingSafeEqual('hello', 'world')).toBe(false);
    });

    it('should return false for different lengths', () => {
      expect(timingSafeEqual('short', 'longer')).toBe(false);
      expect(timingSafeEqual('abc', 'ab')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(timingSafeEqual('', '')).toBe(true);
      expect(timingSafeEqual('', 'a')).toBe(false);
    });
  });

  describe('Request Handling', () => {
    it('should return success for valid request without verification', async () => {
      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/test',
        },
      });

      const result = await pipe.handleRequest({ data: 'test' }, {});

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should reject request with invalid signature', async () => {
      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/test',
          verification: {
            type: 'hmac',
            secret: 'my-secret',
            header: 'x-signature',
          },
        },
      });

      const result = await pipe.handleRequest(
        { data: 'test' },
        { 'x-signature': 'invalid' }
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
    });

    it('should accept request with valid signature', async () => {
      const secret = 'my-secret';
      const body = { data: 'test' };
      const signature = createHmac('sha256', secret)
        .update(JSON.stringify(body))
        .digest('hex');

      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/test',
          verification: {
            type: 'hmac',
            secret,
            header: 'x-signature',
          },
        },
      });

      const result = await pipe.handleRequest(body, { 'x-signature': signature });

      expect(result.success).toBe(true);
    });

    it('should reject request with missing signature header', async () => {
      const pipe = createWebhookPipe({
        name: 'test',
        config: {
          type: 'webhook',
          path: '/test',
          verification: {
            type: 'hmac',
            secret: 'my-secret',
            header: 'x-signature',
          },
        },
      });

      const result = await pipe.handleRequest({ data: 'test' }, {});

      expect(result.success).toBe(false);
      expect(result.status).toBe(401);
    });
  });
});

describe('WebhookSender', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('sendDiscordWebhook', () => {
    it('should send Discord webhook successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      const result = await WebhookSender.sendDiscordWebhook(
        'https://discord.com/api/webhooks/123/abc',
        {
          content: 'Hello, world!',
          username: 'Test Bot',
        }
      );

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/123/abc',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'Hello, world!',
            username: 'Test Bot',
          }),
        }
      );
    });

    it('should handle Discord webhook error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await WebhookSender.sendDiscordWebhook(
        'https://discord.com/api/webhooks/invalid',
        { content: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 404');
      expect(result.status).toBe(404);
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await WebhookSender.sendDiscordWebhook(
        'https://discord.com/api/webhooks/123/abc',
        { content: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should send webhook with embeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await WebhookSender.sendDiscordWebhook(
        'https://discord.com/api/webhooks/123/abc',
        {
          embeds: [
            {
              title: 'Test Embed',
              description: 'This is a test',
              color: 0x5865f2,
            },
          ],
        }
      );

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.embeds).toHaveLength(1);
      expect(body.embeds[0].title).toBe('Test Embed');
    });
  });

  describe('send', () => {
    it('should send generic webhook', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ received: true }),
      });

      const result = await WebhookSender.send(
        'https://api.example.com/webhook',
        { event: 'test', data: { key: 'value' } }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ received: true });
    });

    it('should send with custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await WebhookSender.send(
        'https://api.example.com/webhook',
        { event: 'test' },
        {
          headers: {
            'X-API-Key': 'secret',
            'X-Custom': 'value',
          },
        }
      );

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['X-API-Key']).toBe('secret');
      expect(headers['X-Custom']).toBe('value');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should use custom method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await WebhookSender.send(
        'https://api.example.com/webhook',
        { event: 'test' },
        { method: 'PUT' }
      );

      expect(mockFetch.mock.calls[0][1].method).toBe('PUT');
    });

    it('should handle text response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => { throw new Error('Not JSON'); },
        text: async () => 'OK',
      });

      const result = await WebhookSender.send(
        'https://api.example.com/webhook',
        { event: 'test' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('OK');
    });

    it('should handle error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' }),
      });

      const result = await WebhookSender.send(
        'https://api.example.com/webhook',
        { event: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.data).toEqual({ error: 'Bad request' });
    });

    it('should send string body as-is', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await WebhookSender.send(
        'https://api.example.com/webhook',
        'plain text body'
      );

      expect(mockFetch.mock.calls[0][1].body).toBe('plain text body');
    });
  });
});
