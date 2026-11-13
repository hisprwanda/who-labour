import type { Assessment, TimedReading } from './types.js';

/** Contraction limits per 10 minutes and in seconds. */
export interface ContractionLimits {
  readonly adequateFrom: number;
  readonly adequateLongerThanSeconds: number;
  readonly excessiveAbove: number;
  readonly excessiveLongerThanSeconds: number;
}

/** Labour Care Guide contraction alerts: too few or too many per 10 minutes, too short or too long. */
export interface ContractionAlertLimits {
  readonly fewAtMost: number;
  readonly manyAbove: number;
  readonly shortBelowSeconds: number;
  readonly longAboveSeconds: number;
}

/** How a contraction's length is shaded on the chart. */
export type ContractionDurationBand = 'under-20-seconds' | '20-to-40-seconds' | 'over-40-seconds';

/** The chart shading for a contraction lasting this many seconds. */
export function contractionDurationBand(durationSeconds: number): ContractionDurationBand {
  if (durationSeconds < 20) return 'under-20-seconds';
  return durationSeconds <= 40 ? '20-to-40-seconds' : 'over-40-seconds';
}

/** Flags weak or excessive contractions; excessive ones are `urgent` while oxytocin is running. */
export function classifyContractions(
  contractions: { readonly per10Minutes: number; readonly durationSeconds: number },
  limits: ContractionLimits,
  oxytocinRunning = false,
): Assessment | null {
  const { per10Minutes, durationSeconds } = contractions;
  if (per10Minutes > limits.excessiveAbove || durationSeconds > limits.excessiveLongerThanSeconds) {
    return { code: 'contractions-excessive', severity: oxytocinRunning ? 'urgent' : 'watch' };
  }
  if (per10Minutes < limits.adequateFrom || durationSeconds <= limits.adequateLongerThanSeconds) {
    return { code: 'contractions-inadequate', severity: 'watch' };
  }
  return null;
}

/** Flags contractions outside the alert limits; too many or too long is `urgent` while oxytocin is running. */
export function classifyContractionAlerts(
  contractions: { readonly per10Minutes: number; readonly durationSeconds: number },
  limits: ContractionAlertLimits,
  oxytocinRunning = false,
): Assessment | null {
  const { per10Minutes, durationSeconds } = contractions;
  if (per10Minutes > limits.manyAbove || durationSeconds > limits.longAboveSeconds) {
    return { code: 'contractions-excessive', severity: oxytocinRunning ? 'urgent' : 'watch' };
  }
  if (per10Minutes <= limits.fewAtMost || durationSeconds < limits.shortBelowSeconds) {
    return { code: 'contractions-inadequate', severity: 'watch' };
  }
  return null;
}

/** Whether oxytocin is running at a time, from the last oxytocin reading at or before it. */
export function oxytocinRunningAt(readings: readonly TimedReading[], time: number): boolean {
  let running = false;
  for (const reading of readings) {
    if (reading.time > time) break;
    if (reading.kind === 'oxytocin') running = reading.dropsPerMinute > 0;
  }
  return running;
}
