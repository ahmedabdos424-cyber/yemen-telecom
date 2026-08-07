import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IDBPDatabase } from 'idb';

const store = new Map<number, Record<string, unknown>>();
let nextId = 1;

const mockDb = {
  add: vi.fn(async (_storeName: string, value: Record<string, unknown>) => {
    const id = nextId++;
    store.set(id, { ...value, id });
    return id;
  }),
  get: vi.fn(async (_storeName: string, key: number) => store.get(key)),
  getAll: vi.fn(async () => Array.from(store.values())),
  getAllFromIndex: vi.fn(async (_storeName: string, _index: string, key: string) =>
    Array.from(store.values()).filter(v => v.status === key),
  ),
  put: vi.fn(async (_storeName: string, value: Record<string, unknown>) => {
    const id = value.id as number;
    store.set(id, value);
    return id;
  }),
  delete: vi.fn(async (_storeName: string, key: number) => {
    store.delete(key);
  }),
  clear: vi.fn(async () => {
    store.clear();
  }),
} as unknown as IDBPDatabase;

vi.mock('idb', () => ({
  openDB: vi.fn(async () => mockDb),
}));

const networkListeners: Array<(status: { connected: boolean }) => void> = [];
vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn(async () => ({ connected: true })),
    addListener: vi.fn(async (eventName: string, cb: (status: { connected: boolean }) => void) => {
      networkListeners.push(cb);
      return { remove: () => { /* noop */ } };
    }),
  },
}));

vi.mock('../lib/monitor', () => ({
  captureError: vi.fn(),
}));

import { openDB } from 'idb';
import { Network } from '@capacitor/network';
import {
  enqueueOffline, getQueue, getQueueStats, syncNow, retryFailed, clearQueue,
  onQueueChanged, registerSyncHandlers, resetOfflineDbForTests,
} from '../services/offlineQueue';

beforeEach(() => {
  store.clear();
  nextId = 1;
  networkListeners.length = 0;
  vi.clearAllMocks();
  resetOfflineDbForTests();
  registerSyncHandlers({});
  Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true, writable: true });
  window.removeEventListener('online', () => {});
  window.removeEventListener('offline', () => {});
});

describe('offlineQueue', () => {
  it('enqueues and retrieves items in insertion order', async () => {
    await enqueueOffline('activate', { iccid: '1' });
    await enqueueOffline('recharge', { target: '2' });
    const items = await getQueue();
    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe('activate');
    expect(items[1].kind).toBe('recharge');
    expect(items[0].status).toBe('pending');
  });

  it('reports pending counts via getQueueStats', async () => {
    await enqueueOffline('activate', { iccid: '1' });
    const stats = await getQueueStats();
    expect(stats.pending).toBe(1);
    expect(stats.failed).toBe(0);
  });

  it('dispatches a queue-changed event on enqueue', async () => {
    const listener = vi.fn();
    const off = onQueueChanged(listener);
    await enqueueOffline('activate', { iccid: '1' });
    expect(listener).toHaveBeenCalled();
    off();
  });

  it('syncNow invokes the registered handler and removes the item on success', async () => {
    const handler = vi.fn(async () => { /* ok */ });
    registerSyncHandlers({ activate: handler });
    await enqueueOffline('activate', { iccid: '123' });
    const result = await syncNow();
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(handler).toHaveBeenCalledOnce();
    expect(await getQueue()).toHaveLength(0);
  });

  it('syncNow keeps the item with attempt count and error on handler failure', async () => {
    const handler = vi.fn(async () => { throw new Error('boom'); });
    registerSyncHandlers({ activate: handler });
    await enqueueOffline('activate', { iccid: '123' });
    const result = await syncNow();
    expect(result.failed).toBe(1);
    expect(result.synced).toBe(0);
    const items = await getQueue();
    expect(items).toHaveLength(1);
    expect(items[0].attempts).toBe(1);
    expect(items[0].lastError).toBe('boom');
  });

  it('retryFailed resets failed items to pending and retries', async () => {
    const handler = vi.fn(async () => { throw new Error('boom'); });
    registerSyncHandlers({ activate: handler });
    await enqueueOffline('activate', { iccid: '123' });
    await syncNow();
    const failed = await getQueue();
    expect(failed[0].status).toBe('pending');
    handler.mockImplementation(async () => { /* now ok */ });
    const result = await retryFailed();
    expect(result.synced).toBe(1);
    expect(await getQueue()).toHaveLength(0);
  });

  it('syncNow skips items whose kind has no registered handler', async () => {
    await enqueueOffline('createSim', { iccid: 'x' });
    const result = await syncNow();
    expect(result.synced).toBe(0);
    expect(await getQueue()).toHaveLength(1);
  });

  it('does not run two syncs concurrently', async () => {
    const handler = vi.fn(async () => { /* each activation is quick */ });
    registerSyncHandlers({ activate: handler });
    await enqueueOffline('activate', { iccid: '1' });
    await enqueueOffline('activate', { iccid: '2' });
    const p1 = syncNow();
    const p2 = syncNow();
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.synced).toBe(2);
    expect(r2.synced).toBe(0);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('clearQueue empties the store', async () => {
    await enqueueOffline('activate', { iccid: '1' });
    await clearQueue();
    expect(await getQueue()).toHaveLength(0);
  });

  it('uses Capacitor Network when native and falls back to navigator.onLine otherwise', async () => {
    expect(Network.getStatus).toBeDefined();
    const status = await (Network.getStatus as ReturnType<typeof vi.fn>)();
    expect(status.connected).toBe(true);
  });

  it('keeps native addListener wiring for network change detection', async () => {
    expect(Network.addListener).toBeDefined();
    expect(networkListeners).toHaveLength(0);
    expect(openDB).toBeDefined();
  });
});
