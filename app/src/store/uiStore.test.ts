// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUIStore } from './uiStore';

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
