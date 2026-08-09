// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useScopeOutcome } from './useScopeOutcome';

describe('useScopeOutcome', () => {
  it('starts with no result', () => {
    const { result } = renderHook(() => useScopeOutcome('a'));

    expect(result.current.result).toBeNull();
  });

  it('records an outcome tagged for the current key', () => {
    const { result } = renderHook(() => useScopeOutcome('a'));

    act(() => result.current.setOutcome('a', 'failed'));

    expect(result.current.result).toBe('failed');
  });

  it('resets to null the moment the key changes, even without a new outcome yet', () => {
    const { result, rerender } = renderHook(({ key }: { key: string }) => useScopeOutcome(key), {
      initialProps: { key: 'a' },
    });
    act(() => result.current.setOutcome('a', 'failed'));
    expect(result.current.result).toBe('failed');

    rerender({ key: 'b' });

    expect(result.current.result).toBeNull();
  });

  it('discards an outcome tagged for a key that is no longer current', () => {
    const { result, rerender } = renderHook(({ key }: { key: string }) => useScopeOutcome(key), {
      initialProps: { key: 'a' },
    });

    rerender({ key: 'b' });
    // A slow response for the previous key ('a') arrives after the caller moved on to 'b'.
    act(() => result.current.setOutcome('a', 'not-found'));

    expect(result.current.result).toBeNull();
  });

  it('reset clears the current key back to null', () => {
    const { result } = renderHook(() => useScopeOutcome('a'));
    act(() => result.current.setOutcome('a', 'failed'));

    act(() => result.current.reset());

    expect(result.current.result).toBeNull();
  });
});
