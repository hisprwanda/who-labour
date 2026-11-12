import { describe, expect, it } from 'vitest';
import { hoursBetween, parseInstant, toIsoString } from '../../src/core/time.js';
import { requireInstant } from '../../src/core/time.js';

describe('parseInstant', () => {
  const expected = Date.UTC(2026, 0, 10, 8, 0, 0);

  it.each([
    ['a Date', new Date(expected)],
    ['epoch milliseconds', expected],
    ['an ISO string in UTC', '2026-01-10T08:00:00Z'],
    ['an ISO string with an offset', '2026-01-10T10:00+02:00'],
    ['an ISO string with fractional seconds', '2026-01-10T08:00:00.000Z'],
  ])('accepts %s', (_, instant) => {
    expect(parseInstant(instant)).toBe(expected);
  });

  it.each([
    ['a string without a time zone', '2026-01-10T08:00:00'],
    ['a date without a time', '2026-01-10'],
    ['an invalid Date', new Date(Number.NaN)],
    ['an infinite number', Number.POSITIVE_INFINITY],
    ['an impossible date', '2026-02-31T08:00:00Z'],
    ['hour 24', '2026-01-10T24:00:00Z'],
    ['a 13th month', '2026-13-01T08:00:00Z'],
    ['an offset over 23 hours', '2026-01-10T08:00:00+24:00'],
  ])('rejects %s', (_, instant) => {
    expect(parseInstant(instant)).toBeNull();
  });
});

it('accepts a leap day', () => {
  expect(parseInstant('2024-02-29T08:00:00Z')).toBe(Date.UTC(2024, 1, 29, 8));
});

describe('requireInstant', () => {
  it('throws a TypeError naming the argument', () => {
    expect(() => requireInstant('yesterday', 'now')).toThrow(
      new TypeError('now must be a valid Date, epoch milliseconds or ISO string with a zone'),
    );
  });
});

describe('time helpers', () => {
  it('measures hours, negative when going back', () => {
    expect(hoursBetween(0, 5_400_000)).toBe(1.5);
    expect(hoursBetween(3_600_000, 0)).toBe(-1);
  });

  it('formats as UTC', () => {
    expect(toIsoString(0)).toBe('1970-01-01T00:00:00.000Z');
  });
});
