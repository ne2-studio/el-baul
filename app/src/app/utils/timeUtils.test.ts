import { describe, expect, it } from 'vitest';
import { formatDateRange, formatPartialDate } from './timeUtils';

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
