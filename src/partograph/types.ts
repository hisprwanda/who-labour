import type {
  DistributiveOmit,
  Finding,
  Instant,
  Reading,
  ReadingIssue,
  ReadingKind,
  ReadingOfKind,
} from '../core/types.js';
import type { CervixZone, DilatationLine } from './lines.js';
import type { MonitoringCheck, PartographRuleOverrides } from './rules.js';

/** What `buildPartograph` needs. */
export interface PartographInput {
  readonly readings: readonly Reading[];
  readonly now?: Instant;
  readonly rules?: PartographRuleOverrides;
}

/** A reading placed on the chart: hours from the alert line's start, and its grid column. */
export type ChartedReading<R extends Reading = Reading> = R extends Reading
  ? DistributiveOmit<R, 'at'> & {
      readonly at: string;
      readonly hour: number;
      readonly column: number;
    }
  : never;

/** A cervix reading with the zone it falls in. */
export type CervixPoint = ChartedReading<ReadingOfKind<'cervix'>> & { readonly zone: CervixZone };

/** One time column of the chart. */
export interface GridColumn {
  readonly index: number;
  readonly hour: number;
  readonly from: string;
  readonly to: string;
}

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

/** A routine check: when it was last done, when it is next due and whether it is late. */
export interface DueCheck {
  readonly check: MonitoringCheck;
  readonly intervalMinutes: number;
  readonly lastAt: string | null;
  readonly nextDueAt: string;
  readonly minutesOverdue: number;
}

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

/** A finding with its place on the chart. */
export type ChartedFinding = Finding & { readonly hour: number };

/** The result of `buildPartograph`. */
export type Partograph = NotStartedPartograph | StartedPartograph;
