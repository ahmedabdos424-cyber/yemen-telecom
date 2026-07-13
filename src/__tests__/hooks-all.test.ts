/**
 * @vitest-environment jsdom
 *
 * Tests for all custom hooks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../hooks/useDebounce';
import { useMountedRef } from '../hooks/useMountedRef';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useToast } from '../hooks/useToast';

// ── useDebounce ──────────────────────────────────────────────────────────────

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update before delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );
    rerender({ value: 'b', delay: 300 });
    expect(result.current).toBe('a');
  });

  it('updates after delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );
    rerender({ value: 'b', delay: 300 });
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('b');
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 300 } }
    );
    rerender({ value: 'b', delay: 300 });
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ value: 'c', delay: 300 });
    act(() => { vi.advanceTimersByTime(200); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe('c');
  });

  it('works with delay of 0', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'a', delay: 0 } }
    );
    rerender({ value: 'b', delay: 0 });
    act(() => { vi.advanceTimersByTime(0); });
    expect(result.current).toBe('b');
  });

  it('debounces numeric values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 100 } }
    );
    rerender({ value: 42, delay: 100 });
    expect(result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(42);
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'a' } }
    );
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('b');
  });
});

// ── useMountedRef ────────────────────────────────────────────────────────────

describe('useMountedRef', () => {
  it('returns a ref that is true when mounted', () => {
    const { result } = renderHook(() => useMountedRef());
    expect(result.current.current).toBe(true);
  });

  it('sets ref to false on unmount', () => {
    const { result, unmount } = renderHook(() => useMountedRef());
    expect(result.current.current).toBe(true);
    unmount();
    expect(result.current.current).toBe(false);
  });

  it('remounts and resets to true', () => {
    const { result, unmount } = renderHook(() => useMountedRef());
    unmount();
    const { result: result2 } = renderHook(() => useMountedRef());
    expect(result2.current.current).toBe(true);
  });
});

// ── useNetworkStatus ─────────────────────────────────────────────────────────

describe('useNetworkStatus', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { writable: true, configurable: true, value: true });
  });

  it('returns true when navigator.onLine is true', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);
  });

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(false);
  });

  it('listens for offline events', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(true);
    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current).toBe(false);
  });

  it('listens for online events', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current).toBe(false);
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const spy = vi.spyOn(window, 'addEventListener');
    const unspy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useNetworkStatus());
    expect(spy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(spy).toHaveBeenCalledWith('offline', expect.any(Function));
    unmount();
    expect(unspy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(unspy).toHaveBeenCalledWith('offline', expect.any(Function));
    spy.mockRestore();
    unspy.mockRestore();
  });
});

// ── useToast ─────────────────────────────────────────────────────────────────

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty toasts array', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast with addToast', () => {
    const { result } = renderHook(() => useToast());
    let toastResult: { id: string; timeoutId?: ReturnType<typeof setTimeout> };
    act(() => {
      toastResult = result.current.addToast('success', 'Title', 'Message');
    });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].title).toBe('Title');
    expect(result.current.toasts[0].message).toBe('Message');
  });

  it('dismisses a toast by id', () => {
    const { result } = renderHook(() => useToast());
    let id: string;
    act(() => {
      const r = result.current.addToast('error', 'Err', 'msg');
      id = r.id;
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => { result.current.dismissToast(id!); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('auto-removes toast after duration', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('warning', 'Warn', '', 1000);
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('does not auto-remove when duration is 0', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('info', 'Info', '', 0);
    });
    expect(result.current.toasts).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(result.current.toasts).toHaveLength(1);
  });

  it('toastSuccess adds success toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toastSuccess('Done'); });
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].title).toBe('Done');
  });

  it('toastError adds error toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toastError('Fail'); });
    expect(result.current.toasts[0].type).toBe('error');
  });

  it('toastWarning adds warning toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toastWarning('Careful'); });
    expect(result.current.toasts[0].type).toBe('warning');
  });

  it('toastInfo adds info toast', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toastInfo('Heads up'); });
    expect(result.current.toasts[0].type).toBe('info');
  });

  it('defaults message to empty string when not provided', () => {
    const { result } = renderHook(() => useToast());
    act(() => { result.current.toastSuccess('Title'); });
    expect(result.current.toasts[0].message).toBe('');
  });

  it('generates unique ids for each toast', () => {
    const { result } = renderHook(() => useToast());
    const ids = new Set<string>();
    act(() => {
      for (let i = 0; i < 5; i++) {
        const r = result.current.addToast('info', `t${i}`, '');
        ids.add(r.id);
      }
    });
    expect(ids.size).toBe(5);
  });

  it('can have multiple toasts simultaneously', () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.addToast('success', 'a', '');
      result.current.addToast('error', 'b', '');
      result.current.addToast('warning', 'c', '');
    });
    expect(result.current.toasts).toHaveLength(3);
  });

  it('only dismisses the specified toast', () => {
    const { result } = renderHook(() => useToast());
    let id1: string, id2: string;
    act(() => {
      id1 = result.current.addToast('success', 'a', '').id;
      id2 = result.current.addToast('error', 'b', '').id;
    });
    act(() => { result.current.dismissToast(id1!); });
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].id).toBe(id2!);
  });
});
