import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDateRange, formatPartialDate, getRelativeTime } from './timeUtils';

describe('getRelativeTime', () => {
  const now = new Date('2026-08-09T12:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const minutesAgo = (n: number) => new Date(now.getTime() - n * 60 * 1000);
  const hoursAgo = (n: number) => new Date(now.getTime() - n * 60 * 60 * 1000);
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

  it('returns "ahora" for anything under a minute, including a timestamp slightly in the future', () => {
    expect(getRelativeTime(minutesAgo(0))).toBe('ahora');
    expect(getRelativeTime(new Date(now.getTime() + 5000))).toBe('ahora');
  });

  it('shows minutes up to an hour', () => {
    expect(getRelativeTime(minutesAgo(1))).toBe('hace 1 min');
    expect(getRelativeTime(minutesAgo(45))).toBe('hace 45 min');
  });

  it('shows hours from 1h up to 6h', () => {
    expect(getRelativeTime(hoursAgo(1))).toBe('hace 1 h');
    expect(getRelativeTime(hoursAgo(5))).toBe('hace 5 h');
  });

  it('collapses 6h-24h into "hoy"', () => {
    expect(getRelativeTime(hoursAgo(6))).toBe('hoy');
    expect(getRelativeTime(hoursAgo(23))).toBe('hoy');
  });

  it('collapses 24h-48h into "ayer"', () => {
    expect(getRelativeTime(hoursAgo(24))).toBe('ayer');
    expect(getRelativeTime(hoursAgo(47))).toBe('ayer');
  });

  it('shows days from 2 up to 6', () => {
    expect(getRelativeTime(daysAgo(2))).toBe('hace 2 días');
    expect(getRelativeTime(daysAgo(6))).toBe('hace 6 días');
  });

  it('collapses 7-13 days into "hace 1 semana"', () => {
    expect(getRelativeTime(daysAgo(7))).toBe('hace 1 semana');
    expect(getRelativeTime(daysAgo(13))).toBe('hace 1 semana');
  });

  it('falls back to an absolute "D mes" date from 14 days onward, in the current year', () => {
    expect(getRelativeTime(daysAgo(14))).toBe('26 jul');
    expect(getRelativeTime(new Date('2026-01-15T12:00:00.000Z'))).toBe('15 ene');
  });

  it('includes the year once the date falls outside the current year', () => {
    expect(getRelativeTime(new Date('2025-07-23T12:00:00.000Z'))).toBe('23 jul 2025');
  });
});

describe('formatPartialDate', () => {
  it('formats a full year+month+day date', () => {
    expect(formatPartialDate({ year: 2019, month: 8, day: 3 })).toBe('3 de agosto de 2019');
  });

  it('formats a year+month date without a day', () => {
    expect(formatPartialDate({ year: 2019, month: 8 })).toBe('Agosto de 2019');
  });

  it('formats a year-only date', () => {
    expect(formatPartialDate({ year: 2019 })).toBe('2019');
  });
});

describe('formatDateRange', () => {
  it('returns an empty string when either end is missing', () => {
    expect(formatDateRange(undefined, { year: 2019 })).toBe('');
    expect(formatDateRange({ year: 2019 }, undefined)).toBe('');
    expect(formatDateRange(undefined, undefined)).toBe('');
  });

  it('returns a single formatted date when both ends are identical', () => {
    const date = { year: 2023, month: 9, day: 23 };
    expect(formatDateRange(date, date)).toBe('23 de septiembre de 2023');
  });

  it('joins two full dates in different years with an en dash', () => {
    expect(
      formatDateRange(
        { year: 2023, month: 2, day: 23 },
        { year: 2029, month: 9, day: 25 }
      )
    ).toBe('23 de febrero de 2023 – 25 de septiembre de 2029');
  });

  describe('same year and month, different day — compact day range', () => {
    it('collapses into "D1-D2 de mes de año"', () => {
      expect(
        formatDateRange(
          { year: 2027, month: 9, day: 23 },
          { year: 2027, month: 9, day: 26 }
        )
      ).toBe('23-26 de septiembre de 2027');
    });
  });

  describe('same year, different month, both day-precision — compact month range', () => {
    it('collapses into "D1 mes1 - D2 mes2 de año"', () => {
      expect(
        formatDateRange(
          { year: 2026, month: 8, day: 23 },
          { year: 2026, month: 9, day: 21 }
        )
      ).toBe('23 agosto - 21 septiembre de 2026');
    });
  });

  describe('mixed precision within the same year/month', () => {
    it('falls back to the full "from – to" form when only one side has a day', () => {
      expect(
        formatDateRange(
          { year: 2023, month: 9, day: 5 },
          { year: 2023, month: 9 }
        )
      ).toBe('5 de septiembre de 2023 – Septiembre de 2023');
    });

    it('falls back to the full "from – to" form when only one side has a month', () => {
      expect(
        formatDateRange(
          { year: 2023, month: 2, day: 5 },
          { year: 2023 }
        )
      ).toBe('5 de febrero de 2023 – 2023');
    });
  });
});
