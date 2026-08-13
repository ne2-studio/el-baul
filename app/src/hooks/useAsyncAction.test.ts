// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiConnectionError, ApiError } from '@/api';
import { useAsyncAction } from './useAsyncAction';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

import * as Sentry from '@sentry/react';

beforeEach(() => {
  vi.clearAllMocks();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('useAsyncAction concurrency', () => {
  it('lets two calls with distinct keys run at the same time', async () => {
    const { result } = renderHook(() => useAsyncAction());
    const a = deferred<string>();
    const b = deferred<string>();

    let resultA: unknown;
    let resultB: unknown;
    act(() => {
      result.current.run(() => a.promise, { key: 'a' }).then((r) => (resultA = r));
      result.current.run(() => b.promise, { key: 'b' }).then((r) => (resultB = r));
    });

    expect(result.current.isPending('a')).toBe(true);
    expect(result.current.isPending('b')).toBe(true);

    await act(async () => {
      a.resolve('value-a');
      b.resolve('value-b');
      await Promise.resolve();
    });

    expect(resultA).toEqual({ ok: true, value: 'value-a' });
    expect(resultB).toEqual({ ok: true, value: 'value-b' });
  });

  it('short-circuits a second call sharing a key with one already pending', async () => {
    const { result } = renderHook(() => useAsyncAction());
    const first = deferred<string>();

    let firstResult: unknown;
    let secondResult: unknown;
    act(() => {
      result.current.run(() => first.promise, { key: 'shared' }).then((r) => (firstResult = r));
    });

    // Fired in a separate flush, same key, while the first is still in flight —
    // reproduces the PhotoViewerRoute bug where two unkeyed run() calls collided.
    await act(async () => {
      secondResult = await result.current.run(() => Promise.resolve('should-not-run'), { key: 'shared' });
    });

    expect(secondResult).toEqual({ ok: false, error: expect.any(Error) });

    await act(async () => {
      first.resolve('value-first');
      await Promise.resolve();
    });

    expect(firstResult).toEqual({ ok: true, value: 'value-first' });
  });

  it('collides two unkeyed calls fired in the same flush under the shared default key', async () => {
    const { result } = renderHook(() => useAsyncAction());
    const first = deferred<string>();
    const second = deferred<string>();

    let firstResult: unknown;
    let secondResult: unknown;
    act(() => {
      result.current.run(() => first.promise).then((r) => (firstResult = r));
      result.current.run(() => second.promise).then((r) => (secondResult = r));
    });

    await act(async () => {
      first.resolve('value-first');
      second.resolve('value-second');
      await Promise.resolve();
    });

    // This is exactly the failure mode the PhotoViewerRoute/ChapterRoute comments describe:
    // without a distinct `key`, the second unkeyed call silently no-ops instead of running.
    expect(firstResult).toEqual({ ok: true, value: 'value-first' });
    expect(secondResult).toEqual({ ok: false, error: expect.any(Error) });
  });

  it('allows a call to run again with the same key once the previous one settled', async () => {
    const { result } = renderHook(() => useAsyncAction());

    const first = await act(() => result.current.run(() => Promise.resolve('one'), { key: 'reused' }));
    expect(first).toEqual({ ok: true, value: 'one' });
    expect(result.current.isPending('reused')).toBe(false);

    const second = await act(() => result.current.run(() => Promise.resolve('two'), { key: 'reused' }));
    expect(second).toEqual({ ok: true, value: 'two' });
  });
});

describe('useAsyncAction error reporting', () => {
  // useAsyncAction also logs the caught error to console.error — silence the noise.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports the thrown error to Sentry on failure', async () => {
    const { result } = renderHook(() => useAsyncAction());
    const error = new Error('boom');

    const outcome = await act(() => result.current.run(() => Promise.reject(error)));

    expect(outcome).toEqual({ ok: false, error });
    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('still reports 401/403 errors to Sentry even though the toast is suppressed', async () => {
    const { result } = renderHook(() => useAsyncAction());
    const error = new ApiError(403, 'forbidden', null);

    await act(() => result.current.run(() => Promise.reject(error)));

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('does not report normalized connectivity failures to Sentry', async () => {
    const { result } = renderHook(() => useAsyncAction());
    const error = new ApiConnectionError(new TypeError('Failed to fetch'));

    const outcome = await act(() => result.current.run(() => Promise.reject(error)));

    expect(outcome).toEqual({ ok: false, error });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
