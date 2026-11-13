import type { ChartedFinding, ChartedReading, GridColumn } from '../core/chart.js';
import type { ScheduledCheck } from '../core/schedule.js';
import type { Instant, Reading, ReadingIssue, ReadingKind, ReadingOfKind } from '../core/types.js';
import type { LabourCareCheck, LabourCareGuideRuleOverrides } from './rules.js';

/** What `buildLabourCareGuide` needs; episode facts are optional and passed through to the header. */
export interface LabourCareGuideInput {
  readonly readings: readonly Reading[];
  readonly parity?: number | null;
  readonly labourOnsetAt?: Instant | null;
  readonly membranesRupturedAt?: Instant | null;
  readonly riskFactors?: readonly string[];
  readonly pushingAt?: Instant | null;
  readonly birthAt?: Instant | null;
  readonly now?: Instant;
  readonly rules?: LabourCareGuideRuleOverrides;
}

/** Section 1 of the guide; a missing or invalid fact is `null`. */
export interface LabourCareGuideHeader {
  readonly parity: number | null;
  readonly labourOnsetAt: string | null;
  readonly activeLabourAt: string;
  readonly membranesRupturedAt: string | null;
  readonly riskFactors: readonly string[];
  readonly pushingAt: string | null;
  readonly birthAt: string | null;
}

/** Time spent at one whole centimetre of dilatation and whether it reached its alert limit. */
export interface CentimetreProgress {
  readonly dilatationCm: number;
  readonly reachedAt: string;
  readonly leftAt: string | null;
  readonly hours: number;
  readonly limitHours: number;
  readonly alertAt: string;
  readonly delayed: boolean;
}

/** Time since full dilatation, when pushing began, and whether it reached the parity limit. */
export interface SecondStageProgress {
  readonly startedAt: string;
  readonly pushingAt: string | null;
  readonly hours: number;
  readonly limitHours: number;
  readonly alertAt: string;
  readonly prolonged: boolean;
}

/** Reading kinds in each section of the guide, in printed order. */
export interface LabourCareSections {
  readonly supportiveCare: 'companion' | 'pain-relief' | 'oral-fluid' | 'posture';
  readonly baby:
    | 'fetal-heart-rate'
    | 'decelerations'
    | 'amniotic-fluid'
    | 'fetal-position'
    | 'caput'
    | 'moulding';
  readonly woman: 'pulse' | 'blood-pressure' | 'temperature' | 'urine';
  readonly progress: 'contractions' | 'cervix' | 'descent';
  readonly medication: 'oxytocin' | 'drug' | 'iv-fluid';
}

/** Readings grouped into the guide's sections and rows. */
export type LabourCareRows = {
  readonly [S in keyof LabourCareSections]: {
    readonly [K in LabourCareSections[S] & ReadingKind]: readonly ChartedReading<
      ReadingOfKind<K>
    >[];
  };
};

/** One stage's time columns and its readings by section. */
export interface LabourCareGrid {
  readonly columns: readonly GridColumn[];
  readonly rows: LabourCareRows;
}

/** A Labour Care Guide check: when it was last done, when it is next due and whether it is late. */
export type LabourCareDueCheck = ScheduledCheck<LabourCareCheck>;

/** Labour stage covered by the guide. */
export type LabourCareGuideStatus = 'not-started' | 'active-first-stage' | 'second-stage' | 'birth';

/** No cervix reading has reached active labour yet, so nothing is charted. */
export interface NotStartedLabourCareGuide {
  readonly status: 'not-started';
  readonly issues: readonly ReadingIssue[];
}

/** A charted guide from the start of active labour; every `hour` counts from that start. */
export interface StartedLabourCareGuide {
  readonly status: 'active-first-stage' | 'second-stage' | 'birth';
  readonly header: LabourCareGuideHeader;
  readonly now: string;
  readonly cervix: readonly CentimetreProgress[];
  readonly progress: CentimetreProgress | null;
  readonly secondStage: SecondStageProgress | null;
  readonly grid: {
    readonly firstStage: LabourCareGrid;
    readonly secondStage: LabourCareGrid | null;
  };
  readonly findings: readonly ChartedFinding[];
  readonly due: readonly LabourCareDueCheck[];
  readonly issues: readonly ReadingIssue[];
}

/** The result of `buildLabourCareGuide`. */
export type LabourCareGuide = NotStartedLabourCareGuide | StartedLabourCareGuide;
