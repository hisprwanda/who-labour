import { freezeRules, mergeRuleGroup } from '../core/rules.js';
import type { ContractionLimits } from '../core/contractions.js';
import type { FetalHeartRateLimits, MouldingLimits } from '../core/fetal.js';
import type {
  BloodPressureLimits,
  PulseLimits,
  TemperatureLimits,
  UrineLimits,
} from '../core/maternal.js';

/** A routine check the partograph schedules. */
export type MonitoringCheck =
  'fetal-heart-rate' | 'contractions' | 'pulse' | 'temperature' | 'blood-pressure' | 'vaginal-exam';

/** Where the alert and action lines sit. */
export interface CervixRules {
  readonly activePhaseFromCm: number;
  readonly fullDilatationCm: number;
  readonly alertLineCmPerHour: number;
  readonly actionLineAfterHours: number;
}

/** How the time grid is laid out. */
export interface ChartRules {
  readonly minimumHours: number;
  readonly columnMinutes: number;
}

/** Minutes between checks; `null` means the check is not scheduled. */
export type MonitoringIntervals = Readonly<Record<MonitoringCheck, number | null>>;

/** Every number the modified partograph uses. */
export interface PartographRules {
  readonly cervix: CervixRules;
  readonly chart: ChartRules;
  readonly firstStageMinutes: MonitoringIntervals;
  readonly secondStageMinutes: MonitoringIntervals;
  readonly fetalHeartRate: FetalHeartRateLimits;
  readonly moulding: MouldingLimits;
  readonly contractions: ContractionLimits;
  readonly pulse: PulseLimits;
  readonly bloodPressure: BloodPressureLimits;
  readonly temperature: TemperatureLimits;
  readonly urine: UrineLimits;
}

/** Partial rules to replace WHO defaults, group by group. */
export type PartographRuleOverrides = {
  readonly [G in keyof PartographRules]?: Partial<PartographRules[G]>;
};

/** WHO modified partograph defaults; sources are listed in the README. */
export const WHO_MODIFIED_PARTOGRAPH_RULES: PartographRules = freezeRules({
  // MCPC 2017: active phase from 4 cm, alert line at 1 cm/h, action line 4 h to its right.
  cervix: {
    activePhaseFromCm: 4,
    fullDilatationCm: 10,
    alertLineCmPerHour: 1,
    actionLineAfterHours: 4,
  },
  chart: { minimumHours: 12, columnMinutes: 30 },
  // WHO partograph manual 1994 and MCPC 2017 first-stage monitoring.
  firstStageMinutes: {
    'fetal-heart-rate': 30,
    contractions: 30,
    pulse: 30,
    temperature: 120,
    'blood-pressure': 240,
    'vaginal-exam': 240,
  },
  // MCPC 2017 second-stage monitoring: fetal heart rate every 5 minutes.
  secondStageMinutes: {
    'fetal-heart-rate': 5,
    contractions: 30,
    pulse: 30,
    temperature: 120,
    'blood-pressure': 240,
    'vaginal-exam': null,
  },
  // LCG 2021 alert thresholds (<110, >=160); MCPC 2017 fetal distress (<100, >180).
  fetalHeartRate: { lowBelow: 110, highFrom: 160, distressBelow: 100, distressAbove: 180 },
  // Moulding +++ is a sign of cephalopelvic disproportion (WHO partograph manual 1994, LCG 2021).
  moulding: { severeFrom: 3 },
  // MCPC 2017 adequate: 3 or more in 10 minutes lasting over 40 s; LCG 2021 excessive: over 5 or over 60 s.
  contractions: {
    adequateFrom: 3,
    adequateLongerThanSeconds: 40,
    excessiveAbove: 5,
    excessiveLongerThanSeconds: 60,
  },
  // LCG 2021 alert thresholds.
  pulse: { lowBelow: 60, highFrom: 120 },
  // LCG 2021 alert thresholds; MCPC 2017 severe hypertension (160/110).
  bloodPressure: {
    systolicLowBelow: 80,
    systolicHighFrom: 140,
    diastolicHighFrom: 90,
    systolicSevereFrom: 160,
    diastolicSevereFrom: 110,
  },
  // LCG 2021 alert thresholds.
  temperature: { lowBelow: 35, highFrom: 37.5 },
  // LCG 2021 alert thresholds (P++ and A++).
  urine: { proteinFrom: 2, acetoneFrom: 2 },
});

/** WHO defaults with the given overrides applied; throws a `TypeError` on an invalid value. */
export function resolvePartographRules(overrides: PartographRuleOverrides = {}): PartographRules {
  if (Object.keys(overrides).length === 0) return WHO_MODIFIED_PARTOGRAPH_RULES;
  const who = WHO_MODIFIED_PARTOGRAPH_RULES;
  const rules: PartographRules = {
    cervix: mergeRuleGroup('cervix', who.cervix, overrides.cervix),
    chart: mergeRuleGroup('chart', who.chart, overrides.chart),
    firstStageMinutes: mergeRuleGroup(
      'firstStageMinutes',
      who.firstStageMinutes,
      overrides.firstStageMinutes,
    ),
    secondStageMinutes: mergeRuleGroup(
      'secondStageMinutes',
      who.secondStageMinutes,
      overrides.secondStageMinutes,
    ),
    fetalHeartRate: mergeRuleGroup('fetalHeartRate', who.fetalHeartRate, overrides.fetalHeartRate),
    moulding: mergeRuleGroup('moulding', who.moulding, overrides.moulding),
    contractions: mergeRuleGroup('contractions', who.contractions, overrides.contractions),
    pulse: mergeRuleGroup('pulse', who.pulse, overrides.pulse),
    bloodPressure: mergeRuleGroup('bloodPressure', who.bloodPressure, overrides.bloodPressure),
    temperature: mergeRuleGroup('temperature', who.temperature, overrides.temperature),
    urine: mergeRuleGroup('urine', who.urine, overrides.urine),
  };
  const { activePhaseFromCm, fullDilatationCm, alertLineCmPerHour } = rules.cervix;
  if (activePhaseFromCm >= fullDilatationCm || alertLineCmPerHour <= 0) {
    throw new TypeError(
      'rules.cervix needs activePhaseFromCm < fullDilatationCm and a positive rate',
    );
  }
  if (rules.chart.columnMinutes <= 0)
    throw new TypeError('rules.chart.columnMinutes must be positive');
  return freezeRules(rules);
}
