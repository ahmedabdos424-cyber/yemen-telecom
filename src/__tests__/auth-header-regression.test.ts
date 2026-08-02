/**
 * @vitest-environment jsdom
 *
 * P0-04 Regression tests: web requests must attach the Authorization: Bearer
 * header whenever a token is available. Previously the header was only sent on
 * Capacitor, so web clients relying on the httpOnly cookie alone hit
 * "No token provided" whenever the cookie was unavailable (cross-site hosts,
 * WebView, cleared cookies).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, setToken, clearTokens } from '../api/client';

describe('P0-04 Web Authorization header', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    clearTokens();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should attach Bearer token for web requests when a token is available', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    setToken('web-test-token');
    await api.getAgents();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Authorization']).toBe('Bearer web-test-token');
  });

  it('should attach Bearer token to state-changing requests (createAgent)', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ agent: {}, credentials: {} }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    );
    setToken('web-create-token');
    await api.createAgent({ name: 'وكيل تجريبي', username: 'test_agent', password: 'TestPass123' });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(init.headers['Authorization']).toBe('Bearer web-create-token');
    expect(JSON.parse(init.body)).toMatchObject({ username: 'test_agent', password: 'TestPass123' });
  });

  it('should NOT attach Bearer when no token is stored', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    );
    await api.getAgents();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Authorization']).toBeUndefined();
  });
});
