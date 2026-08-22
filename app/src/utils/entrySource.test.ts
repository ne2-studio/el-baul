import { describe, expect, it } from 'vitest';
import { ENTRY_SOURCE_PARAM, getEntrySource, resolveEntrySourceForSessionOpen } from './entrySource';

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
  it('respeta un entry=push explícito aunque la ruta no sea la raíz', () => {
    expect(resolveEntrySourceForSessionOpen('/baules/123', `?${ENTRY_SOURCE_PARAM}=push`)).toBe('push');
  });

  it('respeta un entry=email explícito', () => {
    expect(resolveEntrySourceForSessionOpen('/baules/123', `?${ENTRY_SOURCE_PARAM}=email`)).toBe('email');
  });

  it('infiere direct al aterrizar en la raíz sin query', () => {
    expect(resolveEntrySourceForSessionOpen('/', '')).toBe('direct');
  });

  it('infiere link al aterrizar en cualquier otra ruta sin entry explícito', () => {
    expect(resolveEntrySourceForSessionOpen('/s/abc123', '')).toBe('link');
  });

  it('ignora un entry no reconocido y sigue infiriendo por la ruta', () => {
    expect(resolveEntrySourceForSessionOpen('/', `?${ENTRY_SOURCE_PARAM}=utm_campaign`)).toBe('direct');
  });
});
