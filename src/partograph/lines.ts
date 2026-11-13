import type { CervixRules } from './rules.js';

/** A point on the cervicograph: hours on the chart, where the alert line starts at hour 0, and dilatation. */
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

/** Hour at which the alert line reaches a dilatation; the line starts at the active phase at hour 0. */
export function alertLineHourAt(dilatationCm: number, rules: CervixRules): number {
  return (
    (Math.min(dilatationCm, rules.fullDilatationCm) - rules.activePhaseFromCm) /
    rules.alertLineCmPerHour
  );
}

/** Hour at which the action line reaches a dilatation. */
export function actionLineHourAt(dilatationCm: number, rules: CervixRules): number {
  return alertLineHourAt(dilatationCm, rules) + rules.actionLineAfterHours;
}

/** The printed alert line, from the active phase at hour 0 up to full dilatation. */
export function alertLine(rules: CervixRules): DilatationLine {
  return {
    start: { hour: 0, dilatationCm: rules.activePhaseFromCm },
    end: {
      hour: alertLineHourAt(rules.fullDilatationCm, rules),
      dilatationCm: rules.fullDilatationCm,
    },
  };
}

/** The printed action line, parallel to the alert line and shifted right. */
export function actionLine(rules: CervixRules): DilatationLine {
  const alert = alertLine(rules);
  return {
    start: { ...alert.start, hour: alert.start.hour + rules.actionLineAfterHours },
    end: { ...alert.end, hour: alert.end.hour + rules.actionLineAfterHours },
  };
}

/** Which side of the alert and action lines a cervix point falls on. */
export function cervixZone(point: ChartPoint, rules: CervixRules): CervixZone {
  const alertHour = alertLineHourAt(point.dilatationCm, rules);
  if (point.hour <= alertHour + EPSILON) return 'left-of-alert-line';
  if (point.hour >= alertHour + rules.actionLineAfterHours - EPSILON) return 'right-of-action-line';
  return 'between-lines';
}
