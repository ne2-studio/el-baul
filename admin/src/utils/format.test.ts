import { describe, expect, it } from 'vitest';
import { formatBytes, formatDate, initials } from './format';

describe('formatDate', () => {
  it('returns an em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('returns an em dash for an empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  it('formats an ISO date string in es-ES short form', () => {
    expect(formatDate('2024-01-15')).toBe('15 ene 2024');
  });
});

describe('initials', () => {
  it('falls back to the fallback string when name is undefined', () => {
    expect(initials(undefined, 'user@example.com')).toBe('U');
  });

  it('falls back to the fallback string when name is null', () => {
    expect(initials(null, 'user@example.com')).toBe('U');
  });

  it('falls back to the fallback string when name is empty', () => {
    expect(initials('', 'user@example.com')).toBe('U');
  });

  it('falls back to the fallback string when name is only whitespace', () => {
    expect(initials('   ', 'user@example.com')).toBe('U');
  });

  it('returns "?" when both name and fallback are empty', () => {
    expect(initials(undefined, '')).toBe('?');
  });

  it('returns a single letter for a single-word name', () => {
    expect(initials('Cher', 'fallback')).toBe('C');
  });

  it('returns two letters for a two-word name', () => {
    expect(initials('Jane Doe', 'fallback')).toBe('JD');
  });

  it('caps at two letters for a name with more than two words', () => {
    expect(initials('Mary Jane Watson', 'fallback')).toBe('MJ');
  });

  it('collapses repeated whitespace between name parts', () => {
    expect(initials('Jane   Doe', 'fallback')).toBe('JD');
  });

  it('uppercases lowercase initials', () => {
    expect(initials('jane doe', 'fallback')).toBe('JD');
  });
});

describe('formatBytes', () => {
  it('returns "0 B" for zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('returns "0 B" for negative values', () => {
    expect(formatBytes(-5)).toBe('0 B');
  });

  it('formats plain bytes without decimals', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes with one decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes with one decimal', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('formats gigabytes with one decimal', () => {
    expect(formatBytes(2.3 * 1024 * 1024 * 1024)).toBe('2.3 GB');
  });
});
