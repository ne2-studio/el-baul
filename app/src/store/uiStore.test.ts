// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasUnseenBaulActivity, useUIStore } from './uiStore';
import { newBaul } from '@/features/photos/useCases/testFactories';

describe('uiStore — cooldown de la recomendación de contribución', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no está en cooldown para un baúl del que nunca se ha resuelto la sugerencia', () => {
    expect(useUIStore.getState().isContributionSuggestionOnCooldown('baul-1')).toBe(false);
  });

  it('entra en cooldown para ese baúl justo después de resolverse', () => {
    useUIStore.getState().startContributionSuggestionCooldown('baul-1');

    expect(useUIStore.getState().isContributionSuggestionOnCooldown('baul-1')).toBe(true);
  });

  it('el cooldown es por baúl: resolver uno no afecta a otro', () => {
    useUIStore.getState().startContributionSuggestionCooldown('baul-1');

    expect(useUIStore.getState().isContributionSuggestionOnCooldown('baul-2')).toBe(false);
  });

  it('sobrevive a un "reinicio" — el estado se lee de localStorage, no de memoria en proceso', () => {
    useUIStore.getState().startContributionSuggestionCooldown('baul-1');

    // Recrear el store (como pasaría al recargar la app) no debe perder el cooldown: nada de
    // lo escrito por startContributionSuggestionCooldown vive únicamente en el módulo actual.
    vi.resetModules();

    expect(useUIStore.getState().isContributionSuggestionOnCooldown('baul-1')).toBe(true);
  });

  it('expira pasados los 60 minutos hardcoded', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-07T10:00:00Z'));
    useUIStore.getState().startContributionSuggestionCooldown('baul-1');

    vi.setSystemTime(new Date('2026-08-07T10:59:59Z'));
    expect(useUIStore.getState().isContributionSuggestionOnCooldown('baul-1')).toBe(true);

    vi.setSystemTime(new Date('2026-08-07T11:00:01Z'));
    expect(useUIStore.getState().isContributionSuggestionOnCooldown('baul-1')).toBe(false);
  });
});

describe('uiStore — isFirstAppLaunch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // isFirstAppLaunch se calcula una sola vez al importar el módulo (ver comentario en
  // uiStore.ts), así que para observar los dos casos hay que forzar una re-importación con
  // vi.resetModules() en vez de reusar la referencia ya cacheada de useUIStore.
  it('es true la primera vez que se carga el módulo, sin marca previa en localStorage', async () => {
    vi.resetModules();
    const { useUIStore: freshUIStore } = await import('./uiStore');

    expect(freshUIStore.getState().isFirstAppLaunch).toBe(true);
  });

  it('deja la marca en localStorage para que la siguiente carga ya no sea "primera vez"', async () => {
    vi.resetModules();
    await import('./uiStore');

    vi.resetModules();
    const { useUIStore: secondLoad } = await import('./uiStore');

    expect(secondLoad.getState().isFirstAppLaunch).toBe(false);
  });
});

describe('uiStore — retirada de fotos ya solicitada', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('una foto sin solicitud previa no cuenta como ya solicitada', () => {
    expect(useUIStore.getState().hasRequestedPhotoRemoval('photo-1')).toBe(false);
  });

  it('marcar una foto la deja como ya solicitada', () => {
    useUIStore.getState().markPhotoRemovalRequested('photo-1');

    expect(useUIStore.getState().hasRequestedPhotoRemoval('photo-1')).toBe(true);
  });

  it('marcar una foto no afecta a otra', () => {
    useUIStore.getState().markPhotoRemovalRequested('photo-1');

    expect(useUIStore.getState().hasRequestedPhotoRemoval('photo-2')).toBe(false);
  });

  it('sobrevive a un "reinicio" — el estado se lee de localStorage, no de memoria en proceso', () => {
    useUIStore.getState().markPhotoRemovalRequested('photo-1');

    vi.resetModules();

    expect(useUIStore.getState().hasRequestedPhotoRemoval('photo-1')).toBe(true);
  });

  it('marcar dos veces la misma foto no duplica la entrada', () => {
    useUIStore.getState().markPhotoRemovalRequested('photo-1');
    useUIStore.getState().markPhotoRemovalRequested('photo-1');

    expect(useUIStore.getState().removalRequestedPhotoIds).toEqual(['photo-1']);
  });
});

describe('uiStore — novedades del selector de baúles', () => {
  beforeEach(() => {
    localStorage.clear();
    useUIStore.setState({ baulActivitySeenAt: {} });
  });

  it('un baúl nunca visto en este dispositivo cuenta como con novedades', () => {
    const baul = newBaul({ updatedAt: '2026-08-01T10:00:00Z' });

    expect(hasUnseenBaulActivity(baul, useUIStore.getState().baulActivitySeenAt)).toBe(true);
  });

  it('marcarlo visto con su updatedAt actual lo deja sin novedades', () => {
    const baul = newBaul({ updatedAt: '2026-08-01T10:00:00Z' });
    useUIStore.getState().markBaulActivitySeen(baul.id, baul.updatedAt);

    expect(hasUnseenBaulActivity(baul, useUIStore.getState().baulActivitySeenAt)).toBe(false);
  });

  it('una actividad posterior a la última vista vuelve a marcarlo con novedades', () => {
    const baul = newBaul({ updatedAt: '2026-08-01T10:00:00Z' }, 'baul-1');
    useUIStore.getState().markBaulActivitySeen(baul.id, baul.updatedAt);

    const updatedBaul = newBaul({ updatedAt: '2026-08-02T10:00:00Z' }, 'baul-1');

    expect(hasUnseenBaulActivity(updatedBaul, useUIStore.getState().baulActivitySeenAt)).toBe(true);
  });

  it('marcar un baúl visto no afecta a otro', () => {
    const seenBaul = newBaul({ updatedAt: '2026-08-01T10:00:00Z' }, 'baul-1');
    const otherBaul = newBaul({ updatedAt: '2026-08-01T10:00:00Z' }, 'baul-2');
    useUIStore.getState().markBaulActivitySeen(seenBaul.id, seenBaul.updatedAt);

    expect(hasUnseenBaulActivity(otherBaul, useUIStore.getState().baulActivitySeenAt)).toBe(true);
  });

  it('sobrevive a un "reinicio" — el estado se lee de localStorage, no de memoria en proceso', () => {
    const baul = newBaul({ updatedAt: '2026-08-01T10:00:00Z' });
    useUIStore.getState().markBaulActivitySeen(baul.id, baul.updatedAt);

    vi.resetModules();

    expect(hasUnseenBaulActivity(baul, useUIStore.getState().baulActivitySeenAt)).toBe(false);
  });
});
