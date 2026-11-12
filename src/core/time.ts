import type { Instant } from './types.js';

/** Milliseconds in one minute. */
export const MS_PER_MINUTE = 60_000;

/** Milliseconds in one hour. */
export const MS_PER_HOUR = 3_600_000;

const ISO_WITH_ZONE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,9})?)?(?:Z|[+-](\d{2}):(\d{2}))$/i;

function parseIsoString(value: string): number | null {
  const match = ISO_WITH_ZONE.exec(value);
  if (match === null) return null;
  const [
    ,
    year,
    month,
    day,
    hours,
    minutes,
    seconds = '0',
    offsetHours = '0',
    offsetMinutes = '0',
  ] = match;
  const daysInMonth = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  const valid =
    Number(month) >= 1 &&
    Number(month) <= 12 &&
    Number(day) >= 1 &&
    Number(day) <= daysInMonth &&
    Number(hours) <= 23 &&
    Number(minutes) <= 59 &&
    Number(seconds) <= 59 &&
    Number(offsetHours) <= 23 &&
    Number(offsetMinutes) <= 59;
  return valid ? Date.parse(value) : null;
}

/** Converts an instant to epoch milliseconds, or `null` if it is invalid or a string has no time zone. */
export function parseInstant(instant: Instant): number | null {
  let time: number | null;
  if (instant instanceof Date) time = instant.getTime();
  else if (typeof instant === 'number') time = instant;
  else time = parseIsoString(instant);
  return time !== null && Number.isFinite(time) ? time : null;
}

/** Like `parseInstant`, but throws a `TypeError` naming the argument when the instant is invalid. */
export function requireInstant(instant: Instant, name: string): number {
  const time = parseInstant(instant);
  if (time === null) {
    throw new TypeError(
      `${name} must be a valid Date, epoch milliseconds or ISO string with a zone`,
    );
  }
  return time;
}

/** Hours from one epoch time to another; negative when `to` is earlier. */
export function hoursBetween(from: number, to: number): number {
  return (to - from) / MS_PER_HOUR;
}

/** Formats epoch milliseconds as an ISO 8601 UTC string. */
export function toIsoString(time: number): string {
  return new Date(time).toISOString();
}
