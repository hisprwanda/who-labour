import type {
  AmnioticFluid,
  Assessment,
  CaputGrade,
  DecelerationType,
  FetalPosition,
  MeconiumGrade,
  MouldingGrade,
} from './types.js';

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

/** The lowest meconium grade that is flagged. */
export interface AmnioticFluidLimits {
  readonly meconiumFrom: MeconiumGrade;
}

/** The lowest caput grade that is flagged. */
export interface CaputLimits {
  readonly severeFrom: CaputGrade;
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

/** Flags blood-stained or absent liquor, and meconium (from `meconiumFrom` when limits and a grade are given). */
export function classifyAmnioticFluid(
  state: AmnioticFluid,
  limits?: AmnioticFluidLimits,
  meconiumGrade?: MeconiumGrade,
): Assessment | null {
  switch (state) {
    case 'meconium':
      return limits !== undefined &&
        meconiumGrade !== undefined &&
        meconiumGrade < limits.meconiumFrom
        ? null
        : { code: 'meconium-stained-liquor', severity: 'watch' };
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

/** Flags late decelerations. */
export function classifyDecelerations(type: DecelerationType): Assessment | null {
  return type === 'late' ? { code: 'late-decelerations', severity: 'watch' } : null;
}

/** Flags an occipito-posterior or occipito-transverse position. */
export function classifyFetalPosition(position: FetalPosition): Assessment | null {
  return position === 'anterior' ? null : { code: 'fetal-position-abnormal', severity: 'watch' };
}

/** Flags caput at or above the severe grade. */
export function classifyCaput(grade: CaputGrade, limits: CaputLimits): Assessment | null {
  return grade >= limits.severeFrom ? { code: 'caput-severe', severity: 'watch' } : null;
}
