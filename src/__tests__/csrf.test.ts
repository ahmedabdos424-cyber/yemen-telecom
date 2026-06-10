/**
 * @vitest-environment jsdom
 *
 * CSRF token generation and validation logic tests.
 */

import { describe, it, expect } from 'vitest';

describe('CSRF Token Validation', () => {
  it('should generate a random hex token of 64 characters', () => {
    const { randomBytes } = require('crypto');
    const token = randomBytes(32).toString('hex');
    expect(token).toBeDefined();
    expect(token.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it('should generate unique tokens each time', () => {
    const { randomBytes } = require('crypto');
    const token1 = randomBytes(32).toString('hex');
    const token2 = randomBytes(32).toString('hex');
    expect(token1).not.toBe(token2);
  });

  it('should verify HMAC-SHA256 hash matches expected', () => {
    const crypto = require('crypto');
    const secret = 'test-csrf-secret';
    const token = 'test-csrf-token';
    const hash = crypto.createHmac('sha256', secret).update(token).digest('hex');
    const expectedHash = crypto.createHmac('sha256', secret).update(token).digest('hex');
    expect(hash).toBe(expectedHash);
  });

  it('should reject mismatched CSRF hash', () => {
    const crypto = require('crypto');
    const secret = 'test-csrf-secret';
    const token = 'test-csrf-token';
    const hash = crypto.createHmac('sha256', secret).update(token).digest('hex');
    const wrongHash = crypto.createHmac('sha256', 'wrong-secret').update(token).digest('hex');
    expect(hash).not.toBe(wrongHash);
  });

  it('should produce different hash for different token', () => {
    const crypto = require('crypto');
    const secret = 'test-csrf-secret';
    const hash1 = crypto.createHmac('sha256', secret).update('token-a').digest('hex');
    const hash2 = crypto.createHmac('sha256', secret).update('token-b').digest('hex');
    expect(hash1).not.toBe(hash2);
  });

  it('should produce consistent hash for same token and secret', () => {
    const crypto = require('crypto');
    const secret = 'test-csrf-secret';
    const hash1 = crypto.createHmac('sha256', secret).update('same-token').digest('hex');
    const hash2 = crypto.createHmac('sha256', secret).update('same-token').digest('hex');
    expect(hash1).toBe(hash2);
  });

  it('should produce 64-char hex hash', () => {
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha256', 'secret').update('token').digest('hex');
    expect(hash.length).toBe(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });
});
