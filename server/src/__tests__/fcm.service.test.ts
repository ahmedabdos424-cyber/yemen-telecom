import { describe, it, expect, vi, beforeEach } from 'vitest';

const dbQuery = vi.fn();

vi.mock('../db', () => ({
  query: (...args: unknown[]) => dbQuery(...args),
}));

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  isFcmEnabled,
  sendPushToTokens,
  getTokensForUsers,
  getManagerTokens,
  getAgentAndManagerTokens,
  fcmDebugState,
  notifyNewMember,
} from '../services/fcm.service';

describe('fcm.service', () => {
  const OLD_ENV = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  afterEach(() => {
    process.env = { ...OLD_ENV };
  });

  it('isFcmEnabled returns false without env vars', () => {
    expect(isFcmEnabled()).toBe(false);
  });

  it('sendPushToTokens is a no-op without env vars', async () => {
    const result = await sendPushToTokens(['token-a'], { title: 't', body: 'b' });
    expect(result).toEqual({ sent: 0, failed: [] });
  });

  it('sendPushToTokens with empty tokens returns no-op', async () => {
    const result = await sendPushToTokens([], { title: 't', body: 'b' });
    expect(result).toEqual({ sent: 0, failed: [] });
  });

  it('getManagerTokens returns tokens from db', async () => {
    dbQuery.mockResolvedValue({ rows: [{ token: 'mgr-token' }] });
    const tokens = await getManagerTokens();
    expect(tokens).toEqual(['mgr-token']);
    expect(dbQuery).toHaveBeenCalled();
  });

  it('getAgentAndManagerTokens returns tokens', async () => {
    dbQuery.mockResolvedValue({ rows: [{ token: 'a' }, { token: 'b' }] });
    expect(await getAgentAndManagerTokens()).toEqual(['a', 'b']);
  });

  it('getTokensForUsers returns empty for no users', async () => {
    expect(await getTokensForUsers([])).toEqual([]);
    expect(dbQuery).not.toHaveBeenCalled();
  });

  it('fcmDebugState exposes init state', () => {
    const state = fcmDebugState();
    expect(state.initialized).toBe(true);
    expect(state.failed).toBe(false);
  });

  it('notifyNewMember resolves tokens for managers and never throws without Firebase env', async () => {
    dbQuery.mockResolvedValue({ rows: [{ token: 'mgr-token' }] });
    await expect(
      notifyNewMember({ memberType: 'agent', name: 'علي أحمد', region: 'صنعاء', createdBy: 'manager' })
    ).resolves.toBeUndefined();
    expect(dbQuery).toHaveBeenCalled();
    const sql = String(dbQuery.mock.calls[0][0]);
    expect(sql).toContain('device_tokens');
    expect(sql).toContain("u.role = 'manager'");
  });
});
