import type { AmnioticFluid, Assessment, MouldingGrade } from './types.js';

/** Fetal heart rate limits in beats per minute. */
export interface FetalHeartRateLimits {
  readonly lowBelow: number;
  readonly highFrom: number;
  readonly distressBelow: number;
  readonly distressAbove: number;
}

/** The lowest moulding grade that is flagged. */
export interface MouldingLimits {
  readonly severeFrom: MouldingGrade;
}

/** Flags a fetal heart rate outside the normal range, `urgent` when it suggests fetal distress. */
export function classifyFetalHeartRate(
  beatsPerMinute: number,
  limits: FetalHeartRateLimits,
): Assessment | null {
  if (beatsPerMinute < limits.lowBelow) {
    return {
      code: 'fetal-heart-rate-low',
      severity: beatsPerMinute < limits.distressBelow ? 'urgent' : 'watch',
    };
  }
  if (beatsPerMinute >= limits.highFrom) {
    return {
      code: 'fetal-heart-rate-high',
      severity: beatsPerMinute > limits.distressAbove ? 'urgent' : 'watch',
    };
  }
  return null;
}

/** Flags meconium-stained, blood-stained or absent liquor. */
export function classifyAmnioticFluid(state: AmnioticFluid): Assessment | null {
  switch (state) {
    case 'meconium':
      return { code: 'meconium-stained-liquor', severity: 'watch' };
    case 'blood':
      return { code: 'blood-stained-liquor', severity: 'watch' };
    case 'absent':
      return { code: 'liquor-absent', severity: 'watch' };
    case 'intact':
    case 'ruptured':
    case 'clear':
      return null;
  }
}

/** Flags moulding at or above the severe grade. */
export function classifyMoulding(grade: MouldingGrade, limits: MouldingLimits): Assessment | null {
  return grade >= limits.severeFrom ? { code: 'moulding-severe', severity: 'watch' } : null;
}
