import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db', () => ({ query: vi.fn() }));

import { getPagination, getDefaultLimit, getMaxLimit, paginatedQuery } from '../helpers';
import { query } from '../db';
import { Request } from 'express';

function mockReq(queryParams: Record<string, string | undefined> = {}): Request {
  return { query: queryParams } as unknown as Request;
}

describe('Pagination Helpers', () => {
  describe('getPagination', () => {
    it('defaults to page=1, limit=50, offset=0', () => {
      const result = getPagination(mockReq({}));
      expect(result).toEqual({ page: 1, limit: 50, offset: 0 });
    });

    it('parses page/limit from query string', () => {
      const result = getPagination(mockReq({ page: '3', limit: '20' }));
      expect(result).toEqual({ page: 3, limit: 20, offset: 40 });
    });

    it('enforces minimum page=1', () => {
      const result = getPagination(mockReq({ page: '0' }));
      expect(result.page).toBe(1);
    });

    it('enforces minimum limit=1 for negative values', () => {
      const result = getPagination(mockReq({ limit: '-5' }));
      expect(result.limit).toBe(1);
    });

    it('treats limit=0 as falsy and falls back to default 50', () => {
      const result = getPagination(mockReq({ limit: '0' }));
      expect(result.limit).toBe(50);
    });

    it('enforces maximum limit=200', () => {
      const result = getPagination(mockReq({ limit: '500' }));
      expect(result.limit).toBe(200);
    });
  });

  describe('getDefaultLimit', () => {
    it('returns 200 by default', () => {
      const orig = process.env.DEFAULT_PAGE_LIMIT;
      delete process.env.DEFAULT_PAGE_LIMIT;
      expect(getDefaultLimit()).toBe(200);
      if (orig !== undefined) process.env.DEFAULT_PAGE_LIMIT = orig;
    });

    it('respects DEFAULT_PAGE_LIMIT env', () => {
      const orig = process.env.DEFAULT_PAGE_LIMIT;
      process.env.DEFAULT_PAGE_LIMIT = '200';
      expect(getDefaultLimit()).toBe(200);
      if (orig !== undefined) process.env.DEFAULT_PAGE_LIMIT = orig;
      else delete process.env.DEFAULT_PAGE_LIMIT;
    });
  });

  describe('getMaxLimit', () => {
    it('returns 5000 by default', () => {
      const orig = process.env.MAX_PAGE_LIMIT;
      delete process.env.MAX_PAGE_LIMIT;
      expect(getMaxLimit()).toBe(5000);
      if (orig !== undefined) process.env.MAX_PAGE_LIMIT = orig;
    });

    it('respects MAX_PAGE_LIMIT env', () => {
      const orig = process.env.MAX_PAGE_LIMIT;
      process.env.MAX_PAGE_LIMIT = '1000';
      expect(getMaxLimit()).toBe(1000);
      if (orig !== undefined) process.env.MAX_PAGE_LIMIT = orig;
      else delete process.env.MAX_PAGE_LIMIT;
    });
  });

  describe('paginatedQuery', () => {
    it('calls count and data queries, returns {data, total, page, limit}', async () => {
      const mockQuery = query as ReturnType<typeof vi.fn>;
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '25' }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }, { id: 2 }] });

      const result = await paginatedQuery<{ id: number }>(
        'SELECT * FROM users',
        'SELECT count(*) FROM users',
        [],
        2,
        10,
        10
      );

      expect(result).toEqual({ data: [{ id: 1 }, { id: 2 }], total: 25, page: 2, limit: 10 });
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });
});
