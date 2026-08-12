import { describe, expect, it } from 'vitest';
import { ENTRY_SOURCE_PARAM, getEntrySource } from './entrySource';

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
});
