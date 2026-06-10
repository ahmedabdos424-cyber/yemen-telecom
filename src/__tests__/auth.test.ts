/**
 * @vitest-environment jsdom
 *
 * Auth token storage tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('Auth Token Storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store and retrieve auth token', () => {
    const token = 'test-jwt-token-12345';
    localStorage.setItem('auth_token', token);
    const retrieved = localStorage.getItem('auth_token');
    expect(retrieved).toBe(token);
  });

  it('should remove auth token', () => {
    localStorage.setItem('auth_token', 'some-token');
    localStorage.removeItem('auth_token');
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('should store and retrieve refresh token', () => {
    const token = 'test-refresh-token';
    localStorage.setItem('refresh_token', token);
    const retrieved = localStorage.getItem('refresh_token');
    expect(retrieved).toBe(token);
  });

  it('should clear all auth tokens', () => {
    localStorage.setItem('auth_token', 'token-1');
    localStorage.setItem('refresh_token', 'token-2');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });

  it('should return null for non-existent token', () => {
    expect(localStorage.getItem('auth_token')).toBeNull();
  });

  it('should store token with special characters', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
    localStorage.setItem('auth_token', token);
    expect(localStorage.getItem('auth_token')).toBe(token);
  });

  it('should handle multiple token keys independently', () => {
    localStorage.setItem('auth_token', 'auth-val');
    localStorage.setItem('refresh_token', 'refresh-val');
    localStorage.removeItem('auth_token');
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBe('refresh-val');
  });
});
