import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Cache Module', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('cacheSet/cacheGet: stores and retrieves values', async () => {
    const { cacheSet, cacheGet } = await import('../cache');
    cacheSet('key1', { data: 'hello' }, 60000);
    expect(cacheGet('key1')).toEqual({ data: 'hello' });
  });

  it('cacheGet: returns undefined for missing keys', async () => {
    const { cacheGet } = await import('../cache');
    expect(cacheGet('nonexistent')).toBeUndefined();
  });

  it('cacheGet: returns undefined for expired entries', async () => {
    const { cacheSet, cacheGet } = await import('../cache');
    cacheSet('expire-me', 'value', 1);
    await new Promise(r => setTimeout(r, 10));
    expect(cacheGet('expire-me')).toBeUndefined();
  });

  it('cacheInvalidate(): clears all entries', async () => {
    const { cacheSet, cacheGet, cacheInvalidate } = await import('../cache');
    cacheSet('a:1', 100, 60000);
    cacheSet('b:2', 200, 60000);
    cacheInvalidate();
    expect(cacheGet('a:1')).toBeUndefined();
    expect(cacheGet('b:2')).toBeUndefined();
  });

  it('cacheInvalidate(prefix): clears only matching entries', async () => {
    const { cacheSet, cacheGet, cacheInvalidate } = await import('../cache');
    cacheSet('users:1', 'alice', 60000);
    cacheSet('users:2', 'bob', 60000);
    cacheSet('sims:1', 'sim1', 60000);
    cacheInvalidate('users:');
    expect(cacheGet('users:1')).toBeUndefined();
    expect(cacheGet('users:2')).toBeUndefined();
    expect(cacheGet('sims:1')).toBe('sim1');
  });

  it('cacheStats(): returns correct size, hits, misses, ratio', async () => {
    const { cacheSet, cacheGet, cacheStats } = await import('../cache');
    cacheSet('k1', 1, 60000);
    cacheSet('k2', 2, 60000);
    cacheGet('k1');
    cacheGet('k2');
    cacheGet('missing');
    const stats = cacheStats();
    expect(stats.size).toBe(2);
    expect(stats.hits).toBeGreaterThanOrEqual(2);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
  });

  it('cacheSet: evicts oldest when exceeding MAX_CACHE_SIZE', async () => {
    const { cacheSet, cacheGet } = await import('../cache');
    for (let i = 0; i < 1001; i++) {
      cacheSet(`key-${i}`, i, 60000);
    }
    expect(cacheGet('key-0')).toBeUndefined();
    expect(cacheGet('key-1000')).toBe(1000);
  });

  it('cacheSet: overwrites existing key without duplicating in keyOrder', async () => {
    const { cacheSet, cacheGet, cacheStats } = await import('../cache');
    cacheSet('dup', 'first', 60000);
    cacheSet('dup', 'second', 60000);
    expect(cacheGet('dup')).toBe('second');
    const stats = cacheStats();
    expect(stats.size).toBe(1);
  });

  it('cacheGet: updates hit/miss counters correctly', async () => {
    const { cacheSet, cacheGet, cacheStats } = await import('../cache');
    cacheSet('hit-test', 'val', 60000);
    cacheGet('hit-test');
    cacheGet('miss-test');
    const stats = cacheStats();
    expect(stats.hits).toBeGreaterThanOrEqual(1);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
    const ratio = parseFloat(stats.ratio);
    expect(ratio).toBeGreaterThan(0);
    expect(ratio).toBeLessThanOrEqual(100);
  });
});
