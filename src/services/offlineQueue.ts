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
const DB_VERSION = 1;
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
      },
    });
  }
  return dbPromise;
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
  const item: OfflineQueueItem = {
    kind,
    payload,
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
    return items.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
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
  let failed = 0;
  try {
    if (!(await getNetworkStatus())) return { synced: 0, failed: 0 };
    const items = (await getQueue()).filter(i => i.status !== 'failed');
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
        failed++;
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
  return { synced, failed };
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
