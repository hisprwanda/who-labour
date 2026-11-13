import type { ReadingKind } from '../core/types.js';
import { gridColumns, type ChartedReading } from '../core/chart.js';
import type { ChartRules } from './rules.js';
import type { PartographGrid } from './types.js';

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
  'companion',
  'pain-relief',
  'oral-fluid',
  'posture',
  'decelerations',
  'fetal-position',
  'caput',
];

/** Time columns covering at least the minimum chart length and every reading, with readings by row. */
export function buildGrid(
  readings: readonly ChartedReading[],
  chartStart: number,
  rules: ChartRules,
): PartographGrid {
  const lastColumn = readings.reduce((max, reading) => Math.max(max, reading.column), -1);
  const columns = gridColumns(
    chartStart,
    chartStart,
    rules.columnMinutes,
    rules.minimumHours,
    lastColumn,
  );
  const rows = Object.fromEntries(
    ROW_ORDER.map((kind) => [kind, readings.filter((reading) => reading.kind === kind)]),
  ) as unknown as PartographGrid['rows'];
  return { columns, rows };
}
