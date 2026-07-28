import { beforeEach, vi } from 'vitest';

const fixedNow = new Date('2024-08-20T12:00:00.000Z').valueOf();
const OriginalDate = Date;

class FixedDate extends OriginalDate {
  constructor(...args: ConstructorParameters<DateConstructor>) {
    super(...(args.length === 0 ? [fixedNow] : args));
  }

  static now() {
    return fixedNow;
  }
}

Object.setPrototypeOf(FixedDate, OriginalDate);
globalThis.Date = FixedDate as DateConstructor;

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.37);
});
