import { describe, expect, it } from 'vitest';
import { appendEntrySource, ENTRY_SOURCE_PARAM, getEntrySource, resolveEntrySourceForSessionOpen } from './entrySource';

describe('getEntrySource', () => {
  it('reconoce entry=push', () => {
    expect(getEntrySource(`?${ENTRY_SOURCE_PARAM}=push`)).toBe('push');
  });

  it('reconoce entry=email', () => {
    expect(getEntrySource(`?${ENTRY_SOURCE_PARAM}=email`)).toBe('email');
  });

  it('devuelve null sin el query param', () => {
    expect(getEntrySource('')).toBeNull();
  });

  it('devuelve null para un valor no reconocido', () => {
    expect(getEntrySource(`?${ENTRY_SOURCE_PARAM}=otra-cosa`)).toBeNull();
  });

  it('ignora otros query params presentes en la misma URL', () => {
    expect(getEntrySource(`?foo=bar&${ENTRY_SOURCE_PARAM}=email&baz=qux`)).toBe('email');
  });

  it('reconoce entry=link', () => {
    expect(getEntrySource(`?${ENTRY_SOURCE_PARAM}=link`)).toBe('link');
  });

  it('reconoce entry=direct', () => {
    expect(getEntrySource(`?${ENTRY_SOURCE_PARAM}=direct`)).toBe('direct');
  });
});

describe('resolveEntrySourceForSessionOpen', () => {
  it('respeta un entry=push explícito', () => {
    expect(resolveEntrySourceForSessionOpen(`?${ENTRY_SOURCE_PARAM}=push`)).toBe('push');
  });

  it('respeta un entry=email explícito', () => {
    expect(resolveEntrySourceForSessionOpen(`?${ENTRY_SOURCE_PARAM}=email`)).toBe('email');
  });

  it('respeta un entry=link explícito', () => {
    expect(resolveEntrySourceForSessionOpen(`?foo=bar&${ENTRY_SOURCE_PARAM}=link`)).toBe('link');
  });

  it('trata como direct cualquier apertura sin entry explícito', () => {
    expect(resolveEntrySourceForSessionOpen('')).toBe('direct');
  });

  it('trata como direct un entry no reconocido', () => {
    expect(resolveEntrySourceForSessionOpen(`?${ENTRY_SOURCE_PARAM}=utm_campaign`)).toBe('direct');
  });
});

describe('appendEntrySource', () => {
  it('usa ? cuando la ruta no tiene query', () => {
    expect(appendEntrySource('/invitacion/baul/tok/aceptar', 'link')).toBe('/invitacion/baul/tok/aceptar?entry=link');
  });

  it('usa & cuando la ruta ya tiene query', () => {
    expect(appendEntrySource('/baules/1?tab=fotos', 'link')).toBe('/baules/1?tab=fotos&entry=link');
  });
});
