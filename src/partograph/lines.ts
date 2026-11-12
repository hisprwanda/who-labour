import type { CervixRules } from './rules.js';

/** A point on the cervicograph: hours since the active phase started, and dilatation. */
export interface ChartPoint {
  readonly hour: number;
  readonly dilatationCm: number;
}

/** A straight line on the cervicograph from `start` to `end`. */
export interface DilatationLine {
  readonly start: ChartPoint;
  readonly end: ChartPoint;
}

/** Where a cervix point sits: on the alert line counts as left, on the action line as right. */
export type CervixZone = 'left-of-alert-line' | 'between-lines' | 'right-of-action-line';

const EPSILON = 1e-9;

/** Hour at which the alert line reaches a dilatation, given the dilatation it started from. */
export function alertLineHourAt(
  dilatationCm: number,
  startDilatationCm: number,
  rules: CervixRules,
): number {
  return (
    (Math.min(dilatationCm, rules.fullDilatationCm) - startDilatationCm) / rules.alertLineCmPerHour
  );
}

/** Hour at which the action line reaches a dilatation, given the dilatation the alert line started from. */
export function actionLineHourAt(
  dilatationCm: number,
  startDilatationCm: number,
  rules: CervixRules,
): number {
  return alertLineHourAt(dilatationCm, startDilatationCm, rules) + rules.actionLineAfterHours;
}

/** The alert line, starting at the first active-phase dilatation and rising to full dilatation. */
export function alertLine(startDilatationCm: number, rules: CervixRules): DilatationLine {
  return {
    start: { hour: 0, dilatationCm: startDilatationCm },
    end: {
      hour: alertLineHourAt(rules.fullDilatationCm, startDilatationCm, rules),
      dilatationCm: rules.fullDilatationCm,
    },
  };
}

/** The action line, parallel to the alert line and shifted right. */
export function actionLine(startDilatationCm: number, rules: CervixRules): DilatationLine {
  const alert = alertLine(startDilatationCm, rules);
  return {
    start: { ...alert.start, hour: alert.start.hour + rules.actionLineAfterHours },
    end: { ...alert.end, hour: alert.end.hour + rules.actionLineAfterHours },
  };
}

/** Which side of the alert and action lines a cervix point falls on. */
export function cervixZone(
  point: ChartPoint,
  startDilatationCm: number,
  rules: CervixRules,
): CervixZone {
  const alertHour = alertLineHourAt(point.dilatationCm, startDilatationCm, rules);
  if (point.hour <= alertHour + EPSILON) return 'left-of-alert-line';
  if (point.hour >= alertHour + rules.actionLineAfterHours - EPSILON) return 'right-of-action-line';
  return 'between-lines';
}
