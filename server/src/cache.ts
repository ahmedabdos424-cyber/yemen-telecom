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

// True LRU: the keyOrder tail is the most-recently-used end. When the cache is
// at capacity a single insert must evict the oldest entry. The loop also guards
// against any desync between store and keyOrder (e.g. a key that was deleted
// but still lingers in keyOrder) so eviction keeps both structures in sync and
// keyOrder can never grow without bound.
function evictIfNeeded(): void {
  while (store.size >= MAX_CACHE_SIZE && keyOrder.length > 0) {
    const oldest = keyOrder.shift();
    if (oldest !== undefined && store.has(oldest)) {
      store.delete(oldest);
      break;
    }
  }
}

function touch(key: string): void {
  const idx = keyOrder.indexOf(key);
  if (idx !== -1) keyOrder.splice(idx, 1);
  keyOrder.push(key);
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
  touch(key);
  hits++;
  return entry.data as T;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  if (!store.has(key)) {
    touch(key);
    evictIfNeeded();
  } else {
    touch(key);
  }
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
