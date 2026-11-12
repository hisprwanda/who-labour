import type { Assessment, DipstickGrade } from './types.js';

/** Maternal pulse limits in beats per minute. */
export interface PulseLimits {
  readonly lowBelow: number;
  readonly highFrom: number;
}

/** Maternal blood pressure limits in mmHg. */
export interface BloodPressureLimits {
  readonly systolicLowBelow: number;
  readonly systolicHighFrom: number;
  readonly diastolicHighFrom: number;
  readonly systolicSevereFrom: number;
  readonly diastolicSevereFrom: number;
}

/** Maternal temperature limits in degrees Celsius. */
export interface TemperatureLimits {
  readonly lowBelow: number;
  readonly highFrom: number;
}

/** The lowest dipstick grades that are flagged. */
export interface UrineLimits {
  readonly proteinFrom: DipstickGrade;
  readonly acetoneFrom: DipstickGrade;
}

/** Flags a maternal pulse that is too slow or too fast. */
export function classifyPulse(beatsPerMinute: number, limits: PulseLimits): Assessment | null {
  if (beatsPerMinute < limits.lowBelow) return { code: 'pulse-low', severity: 'watch' };
  if (beatsPerMinute >= limits.highFrom) return { code: 'pulse-high', severity: 'watch' };
  return null;
}

/** Flags low, high or severely high blood pressure. */
export function classifyBloodPressure(
  systolic: number,
  diastolic: number,
  limits: BloodPressureLimits,
): Assessment | null {
  if (systolic >= limits.systolicSevereFrom || diastolic >= limits.diastolicSevereFrom) {
    return { code: 'blood-pressure-severe', severity: 'urgent' };
  }
  if (systolic >= limits.systolicHighFrom || diastolic >= limits.diastolicHighFrom) {
    return { code: 'blood-pressure-high', severity: 'watch' };
  }
  if (systolic < limits.systolicLowBelow) return { code: 'blood-pressure-low', severity: 'watch' };
  return null;
}

/** Flags a temperature that is too low or too high. */
export function classifyTemperature(celsius: number, limits: TemperatureLimits): Assessment | null {
  if (celsius < limits.lowBelow) return { code: 'temperature-low', severity: 'watch' };
  if (celsius >= limits.highFrom) return { code: 'temperature-high', severity: 'watch' };
  return null;
}

/** Flags protein and acetone in urine; returns one assessment per finding. */
export function classifyUrine(
  urine: { readonly protein?: DipstickGrade; readonly acetone?: DipstickGrade },
  limits: UrineLimits,
): Assessment[] {
  const assessments: Assessment[] = [];
  if (urine.protein !== undefined && urine.protein >= limits.proteinFrom) {
    assessments.push({ code: 'proteinuria', severity: 'watch' });
  }
  if (urine.acetone !== undefined && urine.acetone >= limits.acetoneFrom) {
    assessments.push({ code: 'ketonuria', severity: 'watch' });
  }
  return assessments;
}
