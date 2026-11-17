import type { TimedReading } from '../core/types.js';
import { MS_PER_HOUR, hoursBetween, toIsoString } from '../core/time.js';
import type { LabourCareGuideRules } from './rules.js';
import type { CentimetreProgress, SecondStageProgress } from './types.js';

/** A cervix reading after validation. */
export type CervixTimedReading = TimedReading & { readonly kind: 'cervix' };

/** One centimetre's progress and the exam that showed no progress past its limit, if any. */
export interface CentimetreLevel {
  readonly progress: CentimetreProgress;
  readonly delayExam: CervixTimedReading | null;
}

interface OpenLevel {
  readonly cm: number;
  readonly reachedAt: number;
  readonly alertAt: number;
  leftAt: number | null;
  delayExam: CervixTimedReading | null;
}

/** Time at each whole centimetre; a delay needs an exam at or past the limit that shows no progress. */
export function centimetreProgress(
  cervix: readonly CervixTimedReading[],
  end: number,
  rules: LabourCareGuideRules,
): CentimetreLevel[] {
  const { fullDilatationCm } = rules.cervix;
  const levels: OpenLevel[] = [];
  const open = (reading: CervixTimedReading, cm: number): void => {
    const alertAt = reading.time + (rules.cervixAlertHours[cm] ?? 0) * MS_PER_HOUR;
    levels.push({ cm, reachedAt: reading.time, alertAt, leftAt: null, delayExam: null });
  };
  for (const reading of cervix) {
    const cm = Math.floor(reading.dilatationCm);
    const current = levels.at(-1);
    if (current === undefined) {
      if (reading.dilatationCm < fullDilatationCm) open(reading, cm);
      continue;
    }
    if (current.leftAt !== null) continue;
    if (cm > current.cm) {
      current.leftAt = reading.time;
      if (reading.dilatationCm < fullDilatationCm) open(reading, cm);
    } else if (current.delayExam === null && reading.time >= current.alertAt) {
      current.delayExam = reading;
    }
  }
  return levels.map(({ cm, reachedAt, alertAt, leftAt, delayExam }) => ({
    progress: {
      dilatationCm: cm,
      reachedAt: toIsoString(reachedAt),
      leftAt: leftAt === null ? null : toIsoString(leftAt),
      hours: hoursBetween(reachedAt, leftAt ?? end),
      limitHours: rules.cervixAlertHours[cm] ?? 0,
      alertAt: toIsoString(alertAt),
      limitReached: leftAt === null && end >= alertAt,
      delayed: delayExam !== null,
      delayedAt: delayExam?.at ?? null,
    },
    delayExam,
  }));
}

/** Time since full dilatation against the parity limit; unknown parity uses the stricter multiparous limit. */
export function secondStageProgress(
  fullAt: number,
  end: number,
  parity: number | null,
  rules: LabourCareGuideRules,
): Omit<SecondStageProgress, 'pushingAt'> {
  const { nulliparous, multiparous } = rules.secondStageAlertHours;
  const limitHours = parity === 0 ? nulliparous : multiparous;
  const alertAt = fullAt + limitHours * MS_PER_HOUR;
  return {
    startedAt: toIsoString(fullAt),
    hours: hoursBetween(fullAt, end),
    limitHours,
    alertAt: toIsoString(alertAt),
    prolonged: end >= alertAt,
  };
}
