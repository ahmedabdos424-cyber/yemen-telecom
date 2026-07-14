import { query } from './db';
import { Request } from 'express';

export function getPagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function getDefaultLimit(): number {
  const val = parseInt(process.env.DEFAULT_PAGE_LIMIT || '200', 10);
  const max = getMaxLimit();
  return Math.min(Math.max(1, isNaN(val) ? 200 : val), max);
}

export function getMaxLimit(): number {
  const val = parseInt(process.env.MAX_PAGE_LIMIT || '5000', 10);
  return Math.max(1, isNaN(val) ? 5000 : val);
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
