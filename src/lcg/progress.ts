import type { TimedReading } from '../core/types.js';
import { MS_PER_HOUR, hoursBetween, toIsoString } from '../core/time.js';
import type { LabourCareGuideRules } from './rules.js';
import type { CentimetreProgress, SecondStageProgress } from './types.js';

type CervixTimedReading = TimedReading & { readonly kind: 'cervix' };

/** Time at each whole centimetre from the first active exam; a lower exam never resets the clock. */
export function centimetreProgress(
  cervix: readonly CervixTimedReading[],
  end: number,
  rules: LabourCareGuideRules,
): CentimetreProgress[] {
  const { fullDilatationCm } = rules.cervix;
  const levels: { cm: number; reachedAt: number; leftAt: number | null }[] = [];
  for (const reading of cervix) {
    const cm = Math.floor(reading.dilatationCm);
    const current = levels.at(-1);
    if (current !== undefined && (current.leftAt !== null || cm <= current.cm)) continue;
    if (current !== undefined) current.leftAt = reading.time;
    if (reading.dilatationCm < fullDilatationCm)
      levels.push({ cm, reachedAt: reading.time, leftAt: null });
  }
  return levels.map(({ cm, reachedAt, leftAt }) => {
    const limitHours = rules.cervixAlertHours[cm] ?? 0;
    const alertAt = reachedAt + limitHours * MS_PER_HOUR;
    return {
      dilatationCm: cm,
      reachedAt: toIsoString(reachedAt),
      leftAt: leftAt === null ? null : toIsoString(leftAt),
      hours: hoursBetween(reachedAt, leftAt ?? end),
      limitHours,
      alertAt: toIsoString(alertAt),
      delayed: (leftAt ?? end) >= alertAt,
    };
  });
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
