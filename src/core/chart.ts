import type { DistributiveOmit, Finding, Reading, TimedReading } from './types.js';
import { MS_PER_MINUTE, hoursBetween, toIsoString } from './time.js';

/** A reading placed on a chart: hours from the chart's start, and its grid column. */
export type ChartedReading<R extends Reading = Reading> = R extends Reading
  ? DistributiveOmit<R, 'at'> & {
      readonly at: string;
      readonly hour: number;
      readonly column: number;
    }
  : never;

/** A finding with its place on the chart. */
export type ChartedFinding = Finding & { readonly hour: number };

/** One time column of a chart. */
export interface GridColumn {
  readonly index: number;
  readonly hour: number;
  readonly from: string;
  readonly to: string;
}

/** Places a reading on a chart, dropping its epoch time; `columnStart` defaults to the chart start. */
export function chartReading(
  reading: TimedReading,
  chartStart: number,
  columnMinutes: number,
  columnStart: number = chartStart,
): ChartedReading {
  const { time, index, ...rest } = reading;
  return {
    ...rest,
    hour: hoursBetween(chartStart, time),
    column: Math.floor((time - columnStart) / (columnMinutes * MS_PER_MINUTE)),
  };
}

/** Columns from `start`, covering at least `minimumHours` and up to `lastColumn`; `hour` counts from `chartStart`. */
export function gridColumns(
  start: number,
  chartStart: number,
  columnMinutes: number,
  minimumHours: number,
  lastColumn: number,
): GridColumn[] {
  const columnMs = columnMinutes * MS_PER_MINUTE;
  const count = Math.max(Math.ceil((minimumHours * 60) / columnMinutes), lastColumn + 1);
  return Array.from({ length: count }, (_, index) => ({
    index,
    hour: hoursBetween(chartStart, start + index * columnMs),
    from: toIsoString(start + index * columnMs),
    to: toIsoString(start + (index + 1) * columnMs),
  }));
}
