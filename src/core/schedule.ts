import type { ReadingKind, TimedReading } from './types.js';
import { MS_PER_MINUTE, toIsoString } from './time.js';

/** A routine check: when it was last done, when it is next due and whether it is late. */
export interface ScheduledCheck<C extends string = string> {
  readonly check: C;
  readonly intervalMinutes: number;
  readonly lastAt: string | null;
  readonly nextDueAt: string;
  readonly minutesOverdue: number;
}

/** What `scheduleChecks` needs: readings, the start and now in epoch ms, intervals and the reading kind of each check. */
export interface ScheduleChecksInput<C extends string> {
  readonly readings: readonly TimedReading[];
  readonly startedAt: number;
  readonly now: number;
  readonly intervals: Readonly<Record<C, number | null>>;
  readonly kinds: Readonly<Record<C, ReadingKind>>;
}

function latestOfKind(
  readings: readonly TimedReading[],
  kind: ReadingKind,
): TimedReading | undefined {
  for (let index = readings.length - 1; index >= 0; index -= 1) {
    const reading = readings[index];
    if (reading?.kind === kind) return reading;
  }
  return undefined;
}

/** When each scheduled check is next due; a check never done is due one interval after the start. */
export function scheduleChecks<C extends string>({
  readings,
  startedAt,
  now,
  intervals,
  kinds,
}: ScheduleChecksInput<C>): ScheduledCheck<C>[] {
  const checks: ScheduledCheck<C>[] = [];
  for (const check of Object.keys(kinds) as C[]) {
    const intervalMinutes = intervals[check];
    if (intervalMinutes === null) continue;
    const last = latestOfKind(readings, kinds[check]);
    const nextDue = (last?.time ?? startedAt) + intervalMinutes * MS_PER_MINUTE;
    checks.push({
      check,
      intervalMinutes,
      lastAt: last?.at ?? null,
      nextDueAt: toIsoString(nextDue),
      minutesOverdue: Math.max(0, Math.floor((now - nextDue) / MS_PER_MINUTE)),
    });
  }
  return checks;
}
