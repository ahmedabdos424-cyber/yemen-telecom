/**
 * Redis Cache with In-Memory Fallback
 * Uses Redis when available, falls back to in-memory LRU cache.
 * Compatible with Render free tier (no Redis required).
 */
import { logger } from './logger';

interface CacheEntry {
  value: any;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;

  constructor(maxSize = 1000, defaultTtlMs = 300000) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: any, ttlMs?: number): void {
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

let redisClient: any = null;
let memoryCache: MemoryCache | null = null;

export async function initCache(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    memoryCache = new MemoryCache();
    logger.info('[CACHE] Using in-memory cache (no REDIS_URL set)');
    return;
  }

  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: redisUrl, socket: { connectTimeout: 5000 } });
    redisClient.on('error', (err: any) => {
      logger.warn(`[CACHE] Redis error: ${err.message}`);
      if (!memoryCache) memoryCache = new MemoryCache();
    });
    await redisClient.connect();
    logger.info('[CACHE] Redis connected');
  } catch (err: any) {
    logger.warn(`[CACHE] Redis connection failed: ${err.message}, using in-memory fallback`);
    memoryCache = new MemoryCache();
  }
}

export async function cacheGet(key: string): Promise<any | null> {
  if (redisClient?.isReady) {
    try {
      const val = await redisClient.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      return memoryCache?.get(key) ?? null;
    }
  }
  return memoryCache?.get(key) ?? null;
}

export async function cacheSet(key: string, value: any, ttlSeconds = 300): Promise<void> {
  if (redisClient?.isReady) {
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return;
    } catch { /* fall through to memory */ }
  }
  memoryCache?.set(key, value, ttlSeconds * 1000);
}

export async function cacheDel(key: string): Promise<void> {
  if (redisClient?.isReady) {
    try { await redisClient.del(key); } catch { /* ok */ }
  }
  memoryCache?.delete(key);
}

export function cacheStats(): { backend: string; keys?: number; size?: number } {
  if (redisClient?.isReady) {
    return { backend: 'redis' };
  }
  return { backend: 'memory', size: memoryCache?.size() ?? 0 };
}
