// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCurrentBaulStore } from './useCurrentBaulStore';

describe('useCurrentBaulStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with no baúl remembered when localStorage has nothing stored', () => {
    expect(useCurrentBaulStore.getState().currentBaulId).toBeNull();
  });

  it('setCurrentBaulId updates the in-memory state', () => {
    useCurrentBaulStore.getState().setCurrentBaulId('baul-1');

    expect(useCurrentBaulStore.getState().currentBaulId).toBe('baul-1');
  });

  it('sobrevive a un "reinicio" — el valor se lee de localStorage, no de memoria en proceso', async () => {
    useCurrentBaulStore.getState().setCurrentBaulId('baul-1');

    // Recrear el store (como pasaría al recargar la app) no debe perder el baúl actual: nada
    // de lo escrito por setCurrentBaulId vive únicamente en el módulo actual.
    vi.resetModules();
    const { useCurrentBaulStore: freshStore } = await import('./useCurrentBaulStore');

    expect(freshStore.getState().currentBaulId).toBe('baul-1');
  });

  it('falla en modo abierto (no rompe) cuando localStorage.getItem lanza excepción (modo privado)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });

    vi.resetModules();
    const { useCurrentBaulStore: freshStore } = await import('./useCurrentBaulStore');

    expect(freshStore.getState().currentBaulId).toBeNull();
  });

  it('falla en modo abierto (no rompe, sigue funcionando en memoria) cuando localStorage.setItem lanza excepción (cuota llena)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => useCurrentBaulStore.getState().setCurrentBaulId('baul-1')).not.toThrow();
    expect(useCurrentBaulStore.getState().currentBaulId).toBe('baul-1');
  });
});
