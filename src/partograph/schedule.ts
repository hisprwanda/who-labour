import type { ReadingKind, TimedReading } from '../core/types.js';
import { MS_PER_MINUTE, toIsoString } from '../core/time.js';
import type { MonitoringCheck, MonitoringIntervals } from './rules.js';
import type { DueCheck } from './types.js';

const CHECK_READING: Readonly<Record<MonitoringCheck, ReadingKind>> = {
  'fetal-heart-rate': 'fetal-heart-rate',
  contractions: 'contractions',
  pulse: 'pulse',
  temperature: 'temperature',
  'blood-pressure': 'blood-pressure',
  'vaginal-exam': 'cervix',
};

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

/** What `dueChecks` needs: charted readings, the chart start and the current time, in epoch ms. */
export interface DueChecksInput {
  readonly readings: readonly TimedReading[];
  readonly startedAt: number;
  readonly now: number;
  readonly intervals: MonitoringIntervals;
}

/** When each scheduled check is next due; a check never done is due one interval after the start. */
export function dueChecks({ readings, startedAt, now, intervals }: DueChecksInput): DueCheck[] {
  const checks: DueCheck[] = [];
  for (const check of Object.keys(CHECK_READING) as MonitoringCheck[]) {
    const intervalMinutes = intervals[check];
    if (intervalMinutes === null) continue;
    const kind = CHECK_READING[check];
    const last = latestOfKind(readings, kind);
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
