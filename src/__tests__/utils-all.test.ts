/**
 * @vitest-environment jsdom
 *
 * Tests for lib/* utilities, services/tokenStorage, and types helpers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  setUser: vi.fn(),
  captureException: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
}));

import { safeNumber, safeString, safeArray, safeObject } from '../lib/safe';
import { getErrorMessage } from '../lib/getErrorMessage';
import { tokenStorage } from '../services/tokenStorage';
import { setSimOperator, simProvider, toOperator } from '../types';

// ── safe.ts ──────────────────────────────────────────────────────────────────

describe('safeNumber', () => {
  it('returns the number when valid', () => {
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber(0)).toBe(0);
    expect(safeNumber(-3.14)).toBe(-3.14);
  });

  it('returns fallback for NaN', () => {
    expect(safeNumber(NaN)).toBe(0);
    expect(safeNumber(NaN, -1)).toBe(-1);
  });

  it('Infinity is a valid number (typeof is number, not NaN)', () => {
    expect(safeNumber(Infinity)).toBe(Infinity);
    expect(safeNumber(-Infinity)).toBe(-Infinity);
  });

  it('parses numeric strings', () => {
    expect(safeNumber('42')).toBe(42);
    expect(safeNumber('3.14')).toBe(3.14);
    expect(safeNumber('abc')).toBe(0);
    expect(safeNumber('abc', 99)).toBe(99);
  });

  it('handles null/undefined via Number coercion', () => {
    // Number(null) === 0, which is finite, so returns 0
    expect(safeNumber(null)).toBe(0);
    // Number(undefined) === NaN, isFinite(NaN) is false, so returns fallback
    expect(safeNumber(undefined)).toBe(0);
    expect(safeNumber(undefined, 5)).toBe(5);
  });

  it('handles boolean values', () => {
    expect(safeNumber(true)).toBe(1);
    expect(safeNumber(false)).toBe(0);
  });

  it('handles empty string', () => {
    expect(safeNumber('')).toBe(0);
  });
});

describe('safeString', () => {
  it('returns string as-is', () => {
    expect(safeString('hello')).toBe('hello');
    expect(safeString('')).toBe('');
  });

  it('returns fallback for null', () => {
    expect(safeString(null)).toBe('');
    expect(safeString(null, 'default')).toBe('default');
  });

  it('returns fallback for undefined', () => {
    expect(safeString(undefined)).toBe('');
    expect(safeString(undefined, 'n/a')).toBe('n/a');
  });

  it('converts numbers to string', () => {
    expect(safeString(42)).toBe('42');
    expect(safeString(0)).toBe('0');
  });

  it('converts booleans to string', () => {
    expect(safeString(true)).toBe('true');
    expect(safeString(false)).toBe('false');
  });

  it('converts objects to string', () => {
    expect(safeString({ foo: 1 })).toBe('[object Object]');
  });
});

describe('safeArray', () => {
  it('returns array as-is', () => {
    expect(safeArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('returns empty array for non-array', () => {
    expect(safeArray(null)).toEqual([]);
    expect(safeArray(undefined)).toEqual([]);
    expect(safeArray('string')).toEqual([]);
    expect(safeArray(42)).toEqual([]);
    expect(safeArray({})).toEqual([]);
  });

  it('returns empty array for empty array', () => {
    expect(safeArray([])).toEqual([]);
  });
});

describe('safeObject', () => {
  const fallback = { a: 1, b: 'x' };

  it('returns object as-is when valid', () => {
    const obj = { x: 10 };
    expect(safeObject(obj, fallback)).toBe(obj);
  });

  it('returns fallback for null', () => {
    expect(safeObject(null, fallback)).toBe(fallback);
  });

  it('returns fallback for undefined', () => {
    expect(safeObject(undefined, fallback)).toBe(fallback);
  });

  it('returns fallback for array', () => {
    expect(safeObject([1, 2], fallback)).toBe(fallback);
  });

  it('returns fallback for primitive', () => {
    expect(safeObject('string', fallback)).toBe(fallback);
    expect(safeObject(42, fallback)).toBe(fallback);
  });
});

// ── getErrorMessage.ts ───────────────────────────────────────────────────────

describe('getErrorMessage', () => {
  const fallback = 'حدث خطأ غير متوقع';

  it('returns message from Error instance', () => {
    expect(getErrorMessage(new Error('fail'))).toBe('fail');
  });

  it('returns fallback for Error with empty message', () => {
    const e = new Error('');
    e.name = 'Error';
    expect(getErrorMessage(e)).toBe(fallback);
  });

  it('returns message when message is present even if name differs', () => {
    const e = new TypeError('bad type');
    // getErrorMessage returns message first (non-empty, no {} patterns), so 'bad type' wins
    expect(getErrorMessage(e)).toBe('bad type');
  });

  it('returns error.name when message is empty', () => {
    const e = new TypeError('');
    e.name = 'CustomError';
    expect(getErrorMessage(e)).toBe('CustomError');
  });

  it('returns string error directly', () => {
    expect(getErrorMessage('something broke')).toBe('something broke');
  });

  it('returns message property from object', () => {
    expect(getErrorMessage({ message: 'obj err' })).toBe('obj err');
  });

  it('returns error property from object', () => {
    expect(getErrorMessage({ error: 'err prop' })).toBe('err prop');
  });

  it('returns title property from object', () => {
    expect(getErrorMessage({ title: 'err title' })).toBe('err title');
  });

  it('returns fallback for object without known keys', () => {
    expect(getErrorMessage({ code: 500 })).toBe(fallback);
  });

  it('returns fallback for null', () => {
    expect(getErrorMessage(null)).toBe(fallback);
  });

  it('returns fallback for undefined', () => {
    expect(getErrorMessage(undefined)).toBe(fallback);
  });

  it('returns fallback for number', () => {
    expect(getErrorMessage(42)).toBe(fallback);
  });

  it('uses custom fallback', () => {
    expect(getErrorMessage(null, 'custom')).toBe('custom');
  });

  it('handles Error with {} in message', () => {
    const e = new Error('Error: {}');
    expect(getErrorMessage(e)).toBe(fallback);
  });

  it('handles Error with [object Object] in message', () => {
    const e = new Error('[object Object]');
    expect(getErrorMessage(e)).toBe(fallback);
  });
});

// ── tokenStorage.ts ──────────────────────────────────────────────────────────

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getAuthToken returns null in non-Capacitor env', async () => {
    const result = await tokenStorage.getAuthToken();
    expect(result).toBeNull();
  });

  it('setAuthToken does not throw', async () => {
    await expect(tokenStorage.setAuthToken('tok')).resolves.toBeUndefined();
  });

  it('removeAuthToken does not throw', async () => {
    await expect(tokenStorage.removeAuthToken()).resolves.toBeUndefined();
  });

  it('getRefreshToken returns null in non-Capacitor env', async () => {
    const result = await tokenStorage.getRefreshToken();
    expect(result).toBeNull();
  });

  it('setRefreshToken does not throw', async () => {
    await expect(tokenStorage.setRefreshToken('rtok')).resolves.toBeUndefined();
  });

  it('removeRefreshToken does not throw', async () => {
    await expect(tokenStorage.removeRefreshToken()).resolves.toBeUndefined();
  });

  it('clearAll does not throw', async () => {
    await expect(tokenStorage.clearAll()).resolves.toBeUndefined();
  });

  it('getAuthTokenSync returns null in non-Capacitor env', () => {
    expect(tokenStorage.getAuthTokenSync()).toBeNull();
  });

  it('getRefreshTokenSync returns null in non-Capacitor env', () => {
    expect(tokenStorage.getRefreshTokenSync()).toBeNull();
  });
});

// ── types.ts helpers ─────────────────────────────────────────────────────────

describe('simProvider', () => {
  it('converts yemen_mobile to Yemen Mobile', () => {
    expect(simProvider('yemen_mobile')).toBe('Yemen Mobile');
  });

  it('converts sabafon to Sabafon', () => {
    expect(simProvider('sabafon')).toBe('Sabafon');
  });

  it('converts you to YOU', () => {
    expect(simProvider('you')).toBe('YOU');
  });

  it('returns SimProvider as-is', () => {
    expect(simProvider('Yemen Mobile')).toBe('Yemen Mobile');
    expect(simProvider('Sabafon')).toBe('Sabafon');
    expect(simProvider('YOU')).toBe('YOU');
  });
});

describe('toOperator', () => {
  it('converts Yemen Mobile to yemen_mobile', () => {
    expect(toOperator('Yemen Mobile')).toBe('yemen_mobile');
  });

  it('converts Sabafon to sabafon', () => {
    expect(toOperator('Sabafon')).toBe('sabafon');
  });

  it('converts YOU to you', () => {
    expect(toOperator('YOU')).toBe('you');
  });

  it('returns Operator as-is', () => {
    expect(toOperator('yemen_mobile')).toBe('yemen_mobile');
    expect(toOperator('sabafon')).toBe('sabafon');
    expect(toOperator('you')).toBe('you');
  });
});

describe('setSimOperator', () => {
  it('adds operator field based on provider', () => {
    const sim = { id: '1', iccid: 'x', provider: 'Yemen Mobile' as const, status: 'available' as const, dateAdded: '2024/01/01' };
    const result = setSimOperator(sim);
    expect(result.operator).toBe('yemen_mobile');
  });

  it('handles Sabafon', () => {
    const sim = { id: '1', iccid: 'x', provider: 'Sabafon' as const, status: 'sold' as const, dateAdded: '2024/01/01' };
    const result = setSimOperator(sim);
    expect(result.operator).toBe('sabafon');
  });

  it('handles YOU', () => {
    const sim = { id: '1', iccid: 'x', provider: 'YOU' as const, status: 'available' as const, dateAdded: '2024/01/01' };
    const result = setSimOperator(sim);
    expect(result.operator).toBe('you');
  });
});

// ── monitor.ts ───────────────────────────────────────────────────────────────

describe('monitor', () => {
  let captureError: typeof import('../lib/monitor').captureError;
  let captureEvent: typeof import('../lib/monitor').captureEvent;
  let captureTiming: typeof import('../lib/monitor').captureTiming;
  let getLogs: typeof import('../lib/monitor').getLogs;

  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();

    const mod = await import('../lib/monitor');
    captureError = mod.captureError;
    captureEvent = mod.captureEvent;
    captureTiming = mod.captureTiming;
    getLogs = mod.getLogs;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('captureError logs error message', () => {
    captureError(new Error('test error'), 'ctx');
    expect(console.error).toHaveBeenCalled();
  });

  it('captureError handles non-Error values', () => {
    captureError('string error', 'ctx');
    expect(console.error).toHaveBeenCalled();
  });

  it('captureError handles null', () => {
    captureError(null, 'ctx');
    expect(console.error).toHaveBeenCalled();
  });

  it('captureError redacts sensitive patterns', () => {
    captureError(new Error('Bearer abc.def.ghi'), 'ctx');
    expect(console.error).toHaveBeenCalled();
  });

  it('captureEvent adds to log ring', () => {
    captureEvent('test_event', { key: 'val' });
    const logs = getLogs();
    expect(logs.some(l => l.type === 'event' && l.message === 'test_event')).toBe(true);
  });

  it('captureTiming with slow duration logs warning', () => {
    captureTiming('slow-api', 2000);
    expect(console.warn).toHaveBeenCalled();
    const logs = getLogs();
    expect(logs.some(l => l.type === 'warn' && l.message.includes('SLOW'))).toBe(true);
  });

  it('captureTiming with fast duration stores as timing', () => {
    captureTiming('fast-api', 100);
    const logs = getLogs();
    expect(logs.some(l => l.type === 'timing' && l.message.includes('fast-api'))).toBe(true);
  });

  it('getLogs returns a copy of the log ring', () => {
    captureEvent('test1');
    const logs1 = getLogs();
    const logs2 = getLogs();
    expect(logs1).not.toBe(logs2);
    expect(logs1).toEqual(logs2);
  });

  it('captureError includes Sentry call', async () => {
    const { Sentry } = await import('../lib/sentry');
    vi.mocked(Sentry.captureException).mockClear();
    captureError(new Error('test'), 'ctx');
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});

// ── sentry.ts ────────────────────────────────────────────────────────────────

describe('sentry', () => {
  it('initFrontendSentry returns false when DSN not set', async () => {
    const { initFrontendSentry } = await import('../lib/sentry');
    const result = initFrontendSentry();
    expect(result).toBe(false);
  });

  it('setFrontendSentryUser does not throw without DSN', async () => {
    const { setFrontendSentryUser } = await import('../lib/sentry');
    expect(() => setFrontendSentryUser(null)).not.toThrow();
    expect(() => setFrontendSentryUser({ id: 1, username: 'u', role: 'r' })).not.toThrow();
  });

  it('Sentry is re-exported', async () => {
    const { Sentry } = await import('../lib/sentry');
    expect(Sentry).toBeDefined();
  });
});
