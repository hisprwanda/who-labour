import type { ChartedFinding, ChartedReading, GridColumn } from '../core/chart.js';
import type { Instant, Reading, ReadingIssue, ReadingKind, ReadingOfKind } from '../core/types.js';
export type { ChartedFinding, ChartedReading, GridColumn } from '../core/chart.js';
import type { ScheduledCheck } from '../core/schedule.js';
import type { CervixZone, DilatationLine } from './lines.js';
import type { MonitoringCheck, PartographRuleOverrides } from './rules.js';

/** What `buildPartograph` needs. */
export interface PartographInput {
  readonly readings: readonly Reading[];
  readonly now?: Instant;
  readonly rules?: PartographRuleOverrides;
}

/** A cervix reading with the zone it falls in. */
export type CervixPoint = ChartedReading<ReadingOfKind<'cervix'>> & { readonly zone: CervixZone };

/** The chart's time columns and every reading grouped into its row. */
export interface PartographGrid {
  readonly columns: readonly GridColumn[];
  readonly rows: { readonly [K in ReadingKind]: readonly ChartedReading<ReadingOfKind<K>>[] };
}

/** Where the latest cervix reading sits, and when the lines pass it; `null` once fully dilated. */
export interface CervixProgress {
  readonly at: string;
  readonly dilatationCm: number;
  readonly zone: CervixZone;
  readonly zoneNow: CervixZone;
  readonly alertLineReachedAt: string;
  readonly actionLineReachedAt: string;
}

/** A partograph check: when it was last done, when it is next due and whether it is late. */
export type DueCheck = ScheduledCheck<MonitoringCheck>;

/** Labour stage covered by the partograph. */
export type PartographStatus = 'not-started' | 'active-phase' | 'fully-dilated';

/** No cervix reading has reached the active phase yet, so nothing is charted. */
export interface NotStartedPartograph {
  readonly status: 'not-started';
  readonly issues: readonly ReadingIssue[];
}

/** A charted partograph from the start of the active phase. */
export interface StartedPartograph {
  readonly status: 'active-phase' | 'fully-dilated';
  readonly startedAt: string;
  readonly fullyDilatedAt: string | null;
  readonly now: string;
  readonly alertLine: DilatationLine;
  readonly actionLine: DilatationLine;
  readonly cervix: readonly CervixPoint[];
  readonly progress: CervixProgress | null;
  readonly grid: PartographGrid;
  readonly findings: readonly ChartedFinding[];
  readonly due: readonly DueCheck[];
  readonly issues: readonly ReadingIssue[];
}

/** The result of `buildPartograph`. */
export type Partograph = NotStartedPartograph | StartedPartograph;
