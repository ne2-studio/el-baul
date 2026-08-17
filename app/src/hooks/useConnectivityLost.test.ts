// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { API_CONNECTIVITY_LOST_EVENT } from '@/api';
import { useConnectivityLost } from './useConnectivityLost';

// Regresión issue #38: "Pantalla de 'Sin conexión' salta demasiado a menudo" — con el splash
// visible, la app debía recuperarse sola en cuanto volviera la conexión (evento `online`), sin
// depender de que la persona pulsara "Reintentar" (que hacía location.reload()).
describe('useConnectivityLost', () => {
  it('starts without connectivity lost', () => {
    const { result } = renderHook(() => useConnectivityLost(vi.fn()));

    expect(result.current).toBe(false);
  });

  it('flips to lost when the API reports a connectivity failure', () => {
    const { result } = renderHook(() => useConnectivityLost(vi.fn()));

    act(() => window.dispatchEvent(new CustomEvent(API_CONNECTIVITY_LOST_EVENT)));

    expect(result.current).toBe(true);
  });

  it('recovers on its own when the browser reports it is back online, without a page reload', () => {
    const onRecovered = vi.fn();
    const { result } = renderHook(() => useConnectivityLost(onRecovered));

    act(() => window.dispatchEvent(new CustomEvent(API_CONNECTIVITY_LOST_EVENT)));
    expect(result.current).toBe(true);

    act(() => window.dispatchEvent(new Event('online')));

    expect(result.current).toBe(false);
    expect(onRecovered).toHaveBeenCalledOnce();
  });

  it('does not react to an online event while connectivity was never lost', () => {
    const onRecovered = vi.fn();
    renderHook(() => useConnectivityLost(onRecovered));

    act(() => window.dispatchEvent(new Event('online')));

    expect(onRecovered).not.toHaveBeenCalled();
  });

  it('always invokes the latest onRecovered callback, not a stale one from an earlier render', () => {
    const firstOnRecovered = vi.fn();
    const secondOnRecovered = vi.fn();
    const { result, rerender } = renderHook(({ onRecovered }) => useConnectivityLost(onRecovered), {
      initialProps: { onRecovered: firstOnRecovered },
    });

    act(() => window.dispatchEvent(new CustomEvent(API_CONNECTIVITY_LOST_EVENT)));
    expect(result.current).toBe(true);

    rerender({ onRecovered: secondOnRecovered });
    act(() => window.dispatchEvent(new Event('online')));

    expect(firstOnRecovered).not.toHaveBeenCalled();
    expect(secondOnRecovered).toHaveBeenCalledOnce();
  });
});
