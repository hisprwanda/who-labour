import type { ReadingKind, TimedReading } from '../core/types.js';
import { MS_PER_MINUTE, hoursBetween, toIsoString } from '../core/time.js';
import type { ChartRules } from './rules.js';
import type { ChartedReading, GridColumn, PartographGrid } from './types.js';

const ROW_ORDER: readonly ReadingKind[] = [
  'fetal-heart-rate',
  'amniotic-fluid',
  'moulding',
  'cervix',
  'descent',
  'contractions',
  'oxytocin',
  'drug',
  'iv-fluid',
  'pulse',
  'blood-pressure',
  'temperature',
  'urine',
];

/** Places a reading on the chart, dropping its epoch time. */
export function chartReading(
  reading: TimedReading,
  startedAt: number,
  columnMinutes: number,
): ChartedReading {
  const { time, index, ...rest } = reading;
  return {
    ...rest,
    hour: hoursBetween(startedAt, time),
    column: Math.floor((time - startedAt) / (columnMinutes * MS_PER_MINUTE)),
  };
}

/** Time columns covering at least the minimum chart length and every reading, with readings by row. */
export function buildGrid(
  readings: readonly ChartedReading[],
  startedAt: number,
  rules: ChartRules,
): PartographGrid {
  const minimumColumns = Math.ceil((rules.minimumHours * 60) / rules.columnMinutes);
  const lastColumn = readings.reduce((max, reading) => Math.max(max, reading.column), -1);
  const columnMs = rules.columnMinutes * MS_PER_MINUTE;
  const columns: GridColumn[] = Array.from(
    { length: Math.max(minimumColumns, lastColumn + 1) },
    (_, index) => ({
      index,
      hour: (index * rules.columnMinutes) / 60,
      from: toIsoString(startedAt + index * columnMs),
      to: toIsoString(startedAt + (index + 1) * columnMs),
    }),
  );
  const rows = Object.fromEntries(
    ROW_ORDER.map((kind) => [kind, readings.filter((reading) => reading.kind === kind)]),
  ) as unknown as PartographGrid['rows'];
  return { columns, rows };
}
