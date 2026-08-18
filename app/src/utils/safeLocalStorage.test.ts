// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readJson, readString, writeJson, writeString } from './safeLocalStorage';

describe('safeLocalStorage — readJson/writeJson', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the fallback when the key is missing', () => {
    expect(readJson('missing-key', { foo: 'bar' })).toEqual({ foo: 'bar' });
  });

  it('round-trips a JSON-serializable value through write then read', () => {
    writeJson('key', { a: 1, b: [1, 2, 3] });

    expect(readJson('key', null)).toEqual({ a: 1, b: [1, 2, 3] });
  });

  it('falls back when the stored value is not valid JSON', () => {
    localStorage.setItem('key', 'not-json{');

    expect(readJson('key', 'fallback')).toBe('fallback');
  });

  it('fails open (returns the fallback) when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });

    expect(readJson('key', 'fallback')).toBe('fallback');
  });

  it('fails open (does not throw) when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => writeJson('key', { a: 1 })).not.toThrow();
  });
});

describe('safeLocalStorage — readString/writeString', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when the key is missing', () => {
    expect(readString('missing-key')).toBeNull();
  });

  it('round-trips a string through write then read', () => {
    writeString('key', 'some-value');

    expect(readString('key')).toBe('some-value');
  });

  it('removes the key when writing null', () => {
    writeString('key', 'some-value');

    writeString('key', null);

    expect(readString('key')).toBeNull();
  });

  it('fails open (returns null) when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });

    expect(readString('key')).toBeNull();
  });

  it('fails open (does not throw) when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => writeString('key', 'some-value')).not.toThrow();
  });

  it('fails open (does not throw) when localStorage.removeItem throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => writeString('key', null)).not.toThrow();
  });
});
