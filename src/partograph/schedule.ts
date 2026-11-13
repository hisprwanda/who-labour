import type { ReadingKind, TimedReading } from '../core/types.js';
import { scheduleChecks } from '../core/schedule.js';
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

/** What `dueChecks` needs: charted readings, the chart start and the current time, in epoch ms. */
export interface DueChecksInput {
  readonly readings: readonly TimedReading[];
  readonly startedAt: number;
  readonly now: number;
  readonly intervals: MonitoringIntervals;
}

/** When each scheduled check is next due; a check never done is due one interval after the start. */
export function dueChecks(input: DueChecksInput): DueCheck[] {
  return scheduleChecks({ ...input, kinds: CHECK_READING });
}
