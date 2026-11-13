import type { ContractionAlertLimits } from '../core/contractions.js';
import type {
  AmnioticFluidLimits,
  CaputLimits,
  FetalHeartRateLimits,
  MouldingLimits,
} from '../core/fetal.js';
import type {
  BloodPressureLimits,
  PulseLimits,
  TemperatureLimits,
  UrineLimits,
} from '../core/maternal.js';
import { freezeRules, mergeRuleGroup } from '../core/rules.js';

/** A routine check the Labour Care Guide schedules. */
export type LabourCareCheck =
  | 'fetal-heart-rate'
  | 'decelerations'
  | 'contractions'
  | 'pulse'
  | 'blood-pressure'
  | 'temperature'
  | 'vaginal-exam'
  | 'companion'
  | 'pain-relief'
  | 'oral-fluid'
  | 'posture';

/** Minutes between checks; `null` means the check is not scheduled. */
export type LabourCareIntervals = Readonly<Record<LabourCareCheck, number | null>>;

/** Where active labour starts and what full dilatation is. */
export interface LabourCareCervixRules {
  readonly activePhaseFromCm: number;
  readonly fullDilatationCm: number;
}

/** Hours at one centimetre, keyed by the whole centimetre, after which progress is delayed. */
export type CervixAlertHours = Readonly<Record<number, number>>;

/** Hours of second stage after which it is prolonged, by parity. */
export interface SecondStageAlertHours {
  readonly nulliparous: number;
  readonly multiparous: number;
}

/** How the first-stage and second-stage grids are laid out. */
export interface LabourCareChartRules {
  readonly minimumHours: number;
  readonly columnMinutes: number;
  readonly secondStageMinimumHours: number;
  readonly secondStageColumnMinutes: number;
}

/** Every number the Labour Care Guide uses. */
export interface LabourCareGuideRules {
  readonly cervix: LabourCareCervixRules;
  readonly cervixAlertHours: CervixAlertHours;
  readonly secondStageAlertHours: SecondStageAlertHours;
  readonly chart: LabourCareChartRules;
  readonly firstStageMinutes: LabourCareIntervals;
  readonly secondStageMinutes: LabourCareIntervals;
  readonly fetalHeartRate: FetalHeartRateLimits;
  readonly amnioticFluid: AmnioticFluidLimits;
  readonly moulding: MouldingLimits;
  readonly caput: CaputLimits;
  readonly contractions: ContractionAlertLimits;
  readonly pulse: PulseLimits;
  readonly bloodPressure: BloodPressureLimits;
  readonly temperature: TemperatureLimits;
  readonly urine: UrineLimits;
}

/** Partial rules to replace WHO defaults, group by group. */
export type LabourCareGuideRuleOverrides = {
  readonly [G in keyof LabourCareGuideRules]?: Partial<LabourCareGuideRules[G]>;
};

/** WHO Labour Care Guide defaults; sources are listed in the README. */
export const WHO_LABOUR_CARE_GUIDE_RULES: LabourCareGuideRules = freezeRules({
  // LCG 2021: the cervix rows start at 5 cm.
  cervix: { activePhaseFromCm: 5, fullDilatationCm: 10 },
  // LCG 2021 alert: lag time at each centimetre.
  cervixAlertHours: { 5: 6, 6: 5, 7: 3, 8: 2.5, 9: 2 },
  // LCG manual 2020 (not on the form): second stage alert at 3 h nulliparous, 2 h multiparous.
  secondStageAlertHours: { nulliparous: 3, multiparous: 2 },
  // LCG 2021: 12 hourly first-stage columns and 3 hourly second-stage columns.
  chart: {
    minimumHours: 12,
    columnMinutes: 60,
    secondStageMinimumHours: 3,
    secondStageColumnMinutes: 60,
  },
  // LCG 2021 half-hour cells for FHR and contractions, hourly cells otherwise; LCG manual 2020 for BP, temperature and exams (to verify).
  firstStageMinutes: {
    'fetal-heart-rate': 30,
    decelerations: 30,
    contractions: 30,
    pulse: 60,
    'blood-pressure': 240,
    temperature: 240,
    'vaginal-exam': 240,
    companion: 60,
    'pain-relief': 60,
    'oral-fluid': 60,
    posture: 60,
  },
  // LCG manual 2020 (not on the form): fetal heart every 5 minutes in the second stage (others to verify).
  secondStageMinutes: {
    'fetal-heart-rate': 5,
    decelerations: 5,
    contractions: 30,
    pulse: 60,
    'blood-pressure': 240,
    temperature: 240,
    'vaginal-exam': null,
    companion: 60,
    'pain-relief': 60,
    'oral-fluid': 60,
    posture: 60,
  },
  // LCG 2021 alert (<110, >=160); MCPC 2017 fetal distress (<100, >180).
  fetalHeartRate: { lowBelow: 110, highFrom: 160, distressBelow: 100, distressAbove: 180 },
  // LCG 2021 alert: M+++ (and blood-stained liquor).
  amnioticFluid: { meconiumFrom: 3 },
  // LCG 2021 alert: moulding +++.
  moulding: { severeFrom: 3 },
  // LCG 2021 alert: caput +++.
  caput: { severeFrom: 3 },
  // LCG 2021 alert: 2 or fewer or more than 5 in 10 minutes; under 20 s or over 60 s.
  contractions: { fewAtMost: 2, manyAbove: 5, shortBelowSeconds: 20, longAboveSeconds: 60 },
  // LCG 2021 alert.
  pulse: { lowBelow: 60, highFrom: 120 },
  // LCG 2021 alert; MCPC 2017 severe hypertension (160/110).
  bloodPressure: {
    systolicLowBelow: 80,
    systolicHighFrom: 140,
    diastolicHighFrom: 90,
    systolicSevereFrom: 160,
    diastolicSevereFrom: 110,
  },
  // LCG 2021 alert.
  temperature: { lowBelow: 35, highFrom: 37.5 },
  // LCG 2021 alert: P++ and A++.
  urine: { proteinFrom: 2, acetoneFrom: 2 },
});

/** WHO defaults with the given overrides applied; throws a `TypeError` on an invalid value. */
export function resolveLabourCareGuideRules(
  overrides: LabourCareGuideRuleOverrides = {},
): LabourCareGuideRules {
  if (Object.keys(overrides).length === 0) return WHO_LABOUR_CARE_GUIDE_RULES;
  const who = WHO_LABOUR_CARE_GUIDE_RULES;
  const rules: LabourCareGuideRules = {
    cervix: mergeRuleGroup('cervix', who.cervix, overrides.cervix),
    cervixAlertHours: mergeRuleGroup(
      'cervixAlertHours',
      who.cervixAlertHours,
      overrides.cervixAlertHours,
    ),
    secondStageAlertHours: mergeRuleGroup(
      'secondStageAlertHours',
      who.secondStageAlertHours,
      overrides.secondStageAlertHours,
    ),
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
    amnioticFluid: mergeRuleGroup('amnioticFluid', who.amnioticFluid, overrides.amnioticFluid),
    moulding: mergeRuleGroup('moulding', who.moulding, overrides.moulding),
    caput: mergeRuleGroup('caput', who.caput, overrides.caput),
    contractions: mergeRuleGroup('contractions', who.contractions, overrides.contractions),
    pulse: mergeRuleGroup('pulse', who.pulse, overrides.pulse),
    bloodPressure: mergeRuleGroup('bloodPressure', who.bloodPressure, overrides.bloodPressure),
    temperature: mergeRuleGroup('temperature', who.temperature, overrides.temperature),
    urine: mergeRuleGroup('urine', who.urine, overrides.urine),
  };
  const { activePhaseFromCm, fullDilatationCm } = rules.cervix;
  if (activePhaseFromCm >= fullDilatationCm) {
    throw new TypeError('rules.cervix needs activePhaseFromCm < fullDilatationCm');
  }
  for (let cm = Math.floor(activePhaseFromCm); cm < fullDilatationCm; cm += 1) {
    if (!((rules.cervixAlertHours[cm] ?? 0) > 0)) {
      throw new TypeError(`rules.cervixAlertHours needs a positive limit for ${String(cm)} cm`);
    }
  }
  const { columnMinutes, secondStageColumnMinutes } = rules.chart;
  if (columnMinutes <= 0 || secondStageColumnMinutes <= 0) {
    throw new TypeError('rules.chart column minutes must be positive');
  }
  return freezeRules(rules);
}
