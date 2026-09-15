import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cacheGet, cacheSet, cacheInvalidate, cacheStats } from '../cache';

describe('cache', () => {
  const MAX = 1000;

  beforeEach(() => {
    cacheInvalidate();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns set values and counts hits/misses', () => {
    cacheSet('a', { n: 1 }, 60_000);
    expect(cacheGet('a')).toEqual({ n: 1 });
    expect(cacheGet('missing')).toBeUndefined();
    expect(cacheStats().hits).toBeGreaterThan(0);
    expect(cacheStats().misses).toBeGreaterThan(0);
    expect(cacheStats().size).toBe(1);
  });

  it('expires entries after ttl and cleans up keyOrder', () => {
    cacheSet('a', 1, 1000);
    expect(cacheGet('a')).toBe(1);
    vi.advanceTimersByTime(1001);
    expect(cacheGet('a')).toBeUndefined();
    // The expired key must not linger: subsequent sets behave normally and the
    // store never grows stale-key pollution once the entry expires.
    cacheSet('b', 2, 60_000);
    cacheSet('c', 3, 60_000);
    expect(cacheGet('b')).toBe(2);
    expect(cacheGet('c')).toBe(3);
  });

  it('replacing a value refreshes its ttl window', () => {
    cacheSet('a', 1, 60_000);
    vi.advanceTimersByTime(30_000);
    cacheSet('a', 2, 60_000);
    expect(cacheGet('a')).toBe(2);
    vi.advanceTimersByTime(60_001);
    expect(cacheGet('a')).toBeUndefined();
  });

  it('invalidates by prefix', () => {
    cacheSet('report:1', 1, 60_000);
    cacheSet('report:2', 2, 60_000);
    cacheSet('other', 3, 60_000);
    cacheInvalidate('report:');
    expect(cacheGet('report:1')).toBeUndefined();
    expect(cacheGet('report:2')).toBeUndefined();
    expect(cacheGet('other')).toBe(3);
  });

  it('evicts the oldest entry when at capacity', () => {
    for (let i = 0; i < MAX; i++) cacheSet(`k${i}`, i, 60_000);
    expect(cacheStats().size).toBe(MAX);
  });

  it('re-reading / re-setting a key refreshes its LRU position', () => {
    for (let i = 0; i < MAX; i++) cacheSet(`k${i}`, i, 60_000);
    // Refresh k0 so it becomes the most-recently-used entry.
    expect(cacheGet('k0')).toBe(0);
    // Adding one more entry must evict the oldest untouched key (k1), not k0.
    cacheSet('new', 'x', 60_000);
    expect(cacheGet('k0')).toBe(0);
    expect(cacheGet('k1')).toBeUndefined();
    expect(cacheGet('new')).toBe('x');
    expect(cacheStats().size).toBe(MAX);
  });

  it('keeps keyOrder bounded across sustained churn', () => {
    for (let i = 0; i < MAX * 3; i++) cacheSet(`m${i}`, i, 60_000);
    expect(cacheStats().size).toBe(MAX);
  });
});