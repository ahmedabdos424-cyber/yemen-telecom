import crypto from 'crypto';
import { query } from './db';
import { logger } from './logger';

// Best-effort audit trail write — mirrors the shape used by route-level
// inserts across the codebase. Never blocks the HTTP response on failure.
export async function logAudit(opts: { type: string; title: string; username: string; status?: string }): Promise<void> {
  try {
    const logId = `${opts.type.toUpperCase()}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    await query(
      `INSERT INTO audit_logs (log_id, type, title, username, time, status, device_name, ip_address, mac_address, login_at, session_status)
       VALUES ($1, $2, $3, $4, TO_CHAR(NOW(), 'YYYY/MM/DD HH24:MI:SS'), $5, '', '', '', NOW(), 'active')`,
      [logId, opts.type, opts.title, opts.username, opts.status || 'success']
    );
  } catch (err) {
    logger.warn(`[AUDIT] Failed to log ${opts.type}:`, err);
  }
}