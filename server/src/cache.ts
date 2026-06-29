const MAX_CACHE_SIZE = 1000;

interface CacheEntry<T> {
  data: T;
  ts: number;
  ttl: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const keyOrder: string[] = [];
let hits = 0;
let misses = 0;

function evictIfNeeded(): void {
  if (store.size < MAX_CACHE_SIZE) return;
  const oldest = keyOrder.shift();
  if (oldest !== undefined) store.delete(oldest);
}

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) {
    misses++;
    return undefined;
  }
  if (Date.now() - entry.ts > entry.ttl) {
    store.delete(key);
    const idx = keyOrder.indexOf(key);
    if (idx !== -1) keyOrder.splice(idx, 1);
    misses++;
    return undefined;
  }
  hits++;
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  if (!store.has(key)) {
    keyOrder.push(key);
  }
  evictIfNeeded();
  store.set(key, { data, ts: Date.now(), ttl: ttlMs });
}

export function cacheInvalidate(prefix?: string): void {
  if (!prefix) {
    store.clear();
    keyOrder.length = 0;
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      const idx = keyOrder.indexOf(key);
      if (idx !== -1) keyOrder.splice(idx, 1);
    }
  }
}

export function cacheStats(): { size: number; hits: number; misses: number; ratio: string } {
  const ratio = hits + misses === 0 ? '0.0' : (hits / (hits + misses) * 100).toFixed(1);
  return { size: store.size, hits, misses, ratio: `${ratio}%` };
}
