import { query } from './db';
import { Request } from 'express';

export function getPagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export async function paginatedQuery<T>(
  baseQuery: string,
  countQuery: string,
  params: any[],
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
  const deviceName =
    header('x-device-name') ||
    (uaFirstSegment ? `${uaFirstSegment})` : '') ||
    ua.slice(0, 100) ||
    'Unknown device';
  const deviceId = header('x-device-id') || '';
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    '';
  return { deviceName: deviceName.slice(0, 200), deviceId: deviceId.slice(0, 128), ip: ip.slice(0, 64), userAgent: ua };
}

export function formatDbTimestamp(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
