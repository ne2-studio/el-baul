// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsDesktopViewport } from './useIsDesktopViewport';

// Regresión issue #67: "Foto apaisada se ve más pequeña al girar el teléfono" — un móvil grande
// en horizontal puede superar los 768px de ancho sin ganar altura, así que el breakpoint de
// escritorio no puede depender solo del ancho.
function stubMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return matches;
    },
    addEventListener: (_event: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_event: string, cb: () => void) => listeners.delete(cb),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));

  return {
    setMatches(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useIsDesktopViewport', () => {
  it('is false on a short-and-wide viewport, e.g. a phone rotated to landscape', () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useIsDesktopViewport());

    expect(result.current).toBe(false);
  });

  it('is true on a wide-and-tall viewport, e.g. a tablet or desktop', () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useIsDesktopViewport());

    expect(result.current).toBe(true);
  });

  it('reacts to the viewport crossing the breakpoint, e.g. rotating the device', () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useIsDesktopViewport());
    expect(result.current).toBe(false);

    act(() => media.setMatches(true));

    expect(result.current).toBe(true);
  });
});
