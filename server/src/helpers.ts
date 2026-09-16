import { query } from './db';
import { Request, Response } from 'express';

export function getPagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// Safety cap for legacy unpaginated list shapes (the SPA expects plain arrays).
// Tables larger than this must be read via ?page&limit (max 200 per page).
export const MAX_UNPAGINATED_ROWS = 5000;

// Runs countQuery and, when the table exceeds the cap, responds 400 with a
// pagination hint. Returns true when the response was already sent.
export async function rejectIfUnpaginatedTooLarge(
  res: Response,
  countQuery: string,
  params: unknown[],
  entity: string
): Promise<boolean> {
  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0]?.count || '0', 10);
  if (total > MAX_UNPAGINATED_ROWS) {
    res.status(400).json({
      error: `Too many ${entity} (${total}). Use pagination (?page&limit, max 200 per page).`,
      total,
    });
    return true;
  }
  return false;
}

// Unified pagination contract for report endpoints (J-05): the array
// response shape is preserved (the SPA consumes plain arrays), but every
// endpoint accepts ?page&limit and always reports the full row count via
// the X-Total-Count header — silent LIMIT truncation is gone.
export function getReportPaging(req: Request, def = 100, max = 500) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(max, Math.max(1, parseInt(req.query.limit as string) || def));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function setTotalCount(res: Response, total: number) {
  res.set('X-Total-Count', String(total));
}

export async function paginatedQuery<T>(
  baseQuery: string,
  countQuery: string,
  params: unknown[],
  page: number,
  limit: number,
  offset: number
): Promise<{ data: T[]; total: number; page: number; limit: number }> {
  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0]?.count || '0');
  const dataResult = await query(`${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
  return { data: dataResult.rows as T[], total, page, limit };
}

export interface DeviceInfo {
  deviceName: string;
  deviceId: string;
  ip: string;
  userAgent: string;
}

export function getDeviceInfo(req: Request): DeviceInfo {
  const header = (name: string) => {
    const value = req.headers[name] ?? req.headers[name.toLowerCase()];
    return typeof value === 'string' ? value.trim() : '';
  };
  const ua = (req.headers['user-agent'] as string) || '';
  const uaFirstSegment = ua.split(')')[0];
  const rawDeviceName =
    header('x-device-name') ||
    (uaFirstSegment ? `${uaFirstSegment})` : '') ||
    ua.slice(0, 100) ||
    'Unknown device';
  const deviceId = header('x-device-id') || '';
  // Trust req.ip (Express with `trust proxy 1` behind Render) as the source
  // of truth. The previous code preferred the client-controlled
  // X-Forwarded-For header, letting an attacker rotate it per request and
  // bypass the per-username+IP login lockout (D-05/S-07). XFF is now only a
  // fallback when req.ip is unavailable (e.g. unit tests without proxy).
  const ip =
    (typeof req.ip === 'string' && req.ip.trim()) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    '';
  return { deviceName: sanitizeDeviceField(rawDeviceName, 200), deviceId: sanitizeDeviceField(deviceId, 128), ip: ip.slice(0, 64), userAgent: ua };
}

// Strip markup/event-handler payloads from device fields before they are
// stored in audit_logs (stored-XSS hardening, S-14). Mirrors validation.ts
// stripHtml so helpers stay dependency-free.
function sanitizeDeviceField(v: string, max: number): string {
  return v
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .slice(0, max);
}

export function formatDbTimestamp(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
