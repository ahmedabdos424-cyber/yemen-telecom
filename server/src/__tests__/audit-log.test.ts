import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({
  query: vi.fn(),
}));

import { query } from '../db';
import { logAudit } from '../audit-log';

describe('logAudit best-effort audit trail helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes an audit_logs insert with the provided details', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 1 } as never);

    await logAudit({ type: 'operation_activate', title: 'عملية activate على 770000000', username: 'manager' });

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = vi.mocked(query).mock.calls[0];
    expect(String(sql)).toMatch(/INSERT INTO audit_logs/);
    expect(params).toContain('operation_activate');
    expect(params).toContain('عملية activate على 770000000');
    expect(params).toContain('manager');
  });

  it('uses the provided status when set, otherwise defaults to success', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 1 } as never);

    await logAudit({ type: 'x', title: 'y', username: 'u', status: 'denied' });
    const [, params] = vi.mocked(query).mock.calls[0];
    expect(params).toContain('denied');

    await logAudit({ type: 'z', title: 'w', username: 'v' });
    const [, params2] = vi.mocked(query).mock.calls[1];
    expect(params2).toContain('success');
  });

  it('never throws when the insert fails', async () => {
    vi.mocked(query).mockRejectedValue(new Error('db down'));

    await expect(
      logAudit({ type: 'sims_transferred', title: 'تحويل', username: 'agent_a' })
    ).resolves.toBeUndefined();
  });
});