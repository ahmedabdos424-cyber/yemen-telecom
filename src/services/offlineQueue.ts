import { openDB, IDBPDatabase } from 'idb';
import { Network } from '@capacitor/network';
import { captureError } from '../lib/monitor';

export type OfflineQueueKind = 'activate' | 'recharge' | 'createSim' | 'updateSim';

export interface OfflineQueueItem<T = unknown> {
  id?: number;
  kind: OfflineQueueKind;
  payload: T;
  createdAt: number;
  status: 'pending' | 'syncing' | 'failed';
  attempts: number;
  lastError?: string;
}

export type SyncHandler<T = unknown> = (item: OfflineQueueItem<T>) => Promise<void>;

export interface SyncHandlers {
  activate?: SyncHandler;
  recharge?: SyncHandler;
  createSim?: SyncHandler;
  updateSim?: SyncHandler;
}

export interface QueueStats {
  pending: number;
  failed: number;
  online: boolean;
}

const DB_NAME = 'tele-offline';
const STORE = 'queue';
const KEY_STORE = 'keys';
const KEY_ID = 'aes-gcm';
const DB_VERSION = 2;
const MAX_ATTEMPTS = 5;
const SYNC_EVENT = 'tele:queue-changed';

let isCapacitor = false;
try {
  isCapacitor = !!(window as unknown as { Capacitor?: { isNative?: boolean } }).Capacitor?.isNative;
} catch {
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          store.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains(KEY_STORE)) {
          db.createObjectStore(KEY_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ───────────────────────────────────────────────────────────────────────────
// At-rest encryption for queued payloads (customer names, national IDs and
// contract images must not sit in plaintext in IndexedDB). A device-local
// AES-GCM key is generated once and stored in the same DB, so everything stays
// fully offline-capable while the raw PII is unreadable without the key.
// Graceful degradation: if WebCrypto is unavailable the payload is stored
// as-is so offline sync keeps working on legacy WebViews.
// ───────────────────────────────────────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getOrCreateQueueKey(db: IDBPDatabase): Promise<CryptoKey> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('WebCrypto unavailable');
  const stored = await db.get(KEY_STORE, KEY_ID);
  if (stored?.key) {
    try {
      return await subtle.importKey('raw', base64ToBytes(stored.key), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    } catch {
      /* corrupt key — regenerate below */
    }
  }
  const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = new Uint8Array(await subtle.exportKey('raw', key));
  await db.put(KEY_STORE, { id: KEY_ID, key: bytesToBase64(raw) });
  return key;
}

async function encryptPayload(db: IDBPDatabase, value: unknown): Promise<unknown> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return value;
  try {
    const key = await getOrCreateQueueKey(db);
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const cipher = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(JSON.stringify(value))
    );
    return `v1:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(cipher))}`;
  } catch (err) {
    captureError(err, 'encryptQueuePayload');
    return value;
  }
}

async function decryptPayload(db: IDBPDatabase, raw: unknown): Promise<unknown> {
  const subtle = globalThis.crypto?.subtle;
  if (typeof raw !== 'string' || !subtle || !raw.startsWith('v1:')) return raw;
  try {
    const key = await getOrCreateQueueKey(db);
    const parts = raw.split(':');
    const plain = await subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(parts[1]) },
      key,
      base64ToBytes(parts[2])
    );
    return JSON.parse(new TextDecoder().decode(plain)) as unknown;
  } catch (err) {
    captureError(err, 'decryptQueuePayload');
    return raw;
  }
}

export function resetOfflineDbForTests(): void {
  dbPromise = null;
}

function emitQueueChanged(): void {
  try {
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    /* noop */
  }
}

export async function getNetworkStatus(): Promise<boolean> {
  if (isCapacitor) {
    try {
      const status = await Network.getStatus();
      return status.connected;
    } catch (err) {
      captureError(err, 'getNetworkStatus');
    }
  }
  try {
    return navigator.onLine;
  } catch {
    return true;
  }
}

export async function enqueueOffline(kind: OfflineQueueKind, payload: unknown): Promise<number> {
  const db = await getDb();
  const encrypted = await encryptPayload(db, payload);
  const item: OfflineQueueItem = {
    kind,
    payload: encrypted,
    createdAt: Date.now(),
    status: 'pending',
    attempts: 0,
  };
  const id = await db.add(STORE, item);
  emitQueueChanged();
  return id as number;
}

export async function getQueue(): Promise<OfflineQueueItem[]> {
  try {
    const db = await getDb();
    const items = await db.getAll(STORE);
    const decrypted = await Promise.all(
      items.map(async (item) => ({ ...item, payload: await decryptPayload(db, item.payload) }))
    );
    return decrypted.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  } catch (err) {
    captureError(err, 'getQueue');
    return [];
  }
}

export async function getQueueStats(): Promise<QueueStats> {
  const items = await getQueue();
  return {
    pending: items.filter(i => i.status === 'pending').length,
    failed: items.filter(i => i.status === 'failed').length,
    online: await getNetworkStatus(),
  };
}

async function updateItem(id: number, patch: Partial<OfflineQueueItem>): Promise<void> {
  const db = await getDb();
  const existing = await db.get(STORE, id);
  if (!existing) return;
  await db.put(STORE, { ...existing, ...patch });
}

let syncHandlers: SyncHandlers = {};
export function registerSyncHandlers(handlers: SyncHandlers, merge = false): void {
  syncHandlers = merge ? { ...syncHandlers, ...handlers } : handlers;
}

export function unregisterSyncHandlers(): void {
  syncHandlers = {};
}

export function isSyncRunning(): boolean {
  return running;
}

let running = false;

export async function syncNow(limit = 20): Promise<{ synced: number; failed: number }> {
  if (running) return { synced: 0, failed: 0 };
  running = true;
  let synced = 0;
  let failedCount = 0;
  try {
    if (!(await getNetworkStatus())) return { synced: 0, failed: 0 };
    const all = await getQueue();
    // Safe auto-recovery for CL-3: failed items are promoted back to pending so
    // they get exactly one retry per sync run (attempts are not reset, so
    // MAX_ATTEMPTS still caps runaway retries). Pending items are processed
    // first, failed ones after.
    const failedItems = all.filter(i => i.status === 'failed');
    for (const f of failedItems) {
      if (f.id !== undefined) await updateItem(f.id, { status: 'pending' });
    }
    const items = [...all.filter(i => i.status !== 'failed'), ...failedItems];
    const batch = items.slice(0, limit);
    for (const item of batch) {
      const id = item.id!;
      const handler = syncHandlers[item.kind];
      if (!handler) continue;
      await updateItem(id, { status: 'syncing' });
      try {
        await handler(item);
        await dbDelete(id);
        synced++;
      } catch (err) {
        failedCount++;
        const attempts = (item.attempts ?? 0) + 1;
        const lastError = err instanceof Error ? err.message : String(err);
        await updateItem(id, { status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', attempts, lastError });
      }
    }
  } catch (err) {
    captureError(err, 'syncNow');
  } finally {
    running = false;
    emitQueueChanged();
  }
  return { synced, failed: failedCount };
}

async function dbDelete(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, id);
}

export async function retryFailed(): Promise<{ synced: number; failed: number }> {
  const db = await getDb();
  const failedItems = await db.getAllFromIndex(STORE, 'by-status', 'failed');
  for (const item of failedItems) {
    if (item.id !== undefined) await updateItem(item.id, { status: 'pending', attempts: 0 });
  }
  return syncNow();
}

export async function clearQueue(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE);
  emitQueueChanged();
}

export function onQueueChanged(cb: () => void): () => void {
  const listener = () => cb();
  window.addEventListener(SYNC_EVENT, listener);
  return () => window.removeEventListener(SYNC_EVENT, listener);
}

let networkListeners: Array<(online: boolean) => void> = [];
let networkListenerBound = false;

export function onNetworkChange(cb: (online: boolean) => void): () => void {
  networkListeners.push(cb);
  if (!networkListenerBound) {
    networkListenerBound = true;
    const notify = (online: boolean) => {
      for (const l of networkListeners) {
        try {
          l(online);
        } catch {
          /* noop */
        }
      }
    };
    window.addEventListener('online', () => notify(true));
    window.addEventListener('offline', () => notify(false));
    if (isCapacitor) {
      Network.addListener('networkStatusChange', (status) => notify(status.connected)).catch(() => {
        /* plugin may be unavailable in web preview */
      });
    }
  }
  return () => {
    networkListeners = networkListeners.filter(l => l !== cb);
  };
}
