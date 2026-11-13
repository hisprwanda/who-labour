import type {
  Assessment,
  Instant,
  ReadingIssue,
  ReadingKind,
  TimedReading,
} from '../core/types.js';
import { MS_PER_HOUR, parseInstant, requireInstant, toIsoString } from '../core/time.js';
import { normalizeReadings } from '../core/readings.js';
import {
  chartReading,
  gridColumns,
  type ChartedFinding,
  type ChartedReading,
} from '../core/chart.js';
import {
  classifyAmnioticFluid,
  classifyCaput,
  classifyDecelerations,
  classifyFetalHeartRate,
  classifyFetalPosition,
  classifyMoulding,
} from '../core/fetal.js';
import {
  classifyBloodPressure,
  classifyPulse,
  classifyTemperature,
  classifyUrine,
} from '../core/maternal.js';
import { classifyContractionAlerts, oxytocinRunningAt } from '../core/contractions.js';
import { classifyPosture, classifySupportiveCare } from '../core/supportive.js';
import { scheduleChecks } from '../core/schedule.js';
import {
  resolveLabourCareGuideRules,
  type LabourCareCheck,
  type LabourCareGuideRules,
} from './rules.js';
import { centimetreProgress, secondStageProgress } from './progress.js';
import type {
  LabourCareGrid,
  LabourCareGuide,
  LabourCareGuideInput,
  LabourCareRows,
  LabourCareSections,
} from './types.js';

type CervixTimedReading = TimedReading & { readonly kind: 'cervix' };

const SECTIONS: { readonly [S in keyof LabourCareSections]: readonly LabourCareSections[S][] } = {
  supportiveCare: ['companion', 'pain-relief', 'oral-fluid', 'posture'],
  baby: [
    'fetal-heart-rate',
    'decelerations',
    'amniotic-fluid',
    'fetal-position',
    'caput',
    'moulding',
  ],
  woman: ['pulse', 'blood-pressure', 'temperature', 'urine'],
  progress: ['contractions', 'cervix', 'descent'],
  medication: ['oxytocin', 'drug', 'iv-fluid'],
};

const CHECK_READING: Readonly<Record<LabourCareCheck, ReadingKind>> = {
  'fetal-heart-rate': 'fetal-heart-rate',
  decelerations: 'decelerations',
  contractions: 'contractions',
  pulse: 'pulse',
  'blood-pressure': 'blood-pressure',
  temperature: 'temperature',
  'vaginal-exam': 'cervix',
  companion: 'companion',
  'pain-relief': 'pain-relief',
  'oral-fluid': 'oral-fluid',
  posture: 'posture',
};

function isCervix(reading: TimedReading): reading is CervixTimedReading {
  return reading.kind === 'cervix';
}

function assess(
  reading: TimedReading,
  readings: readonly TimedReading[],
  rules: LabourCareGuideRules,
): readonly Assessment[] {
  const one = (assessment: Assessment | null): readonly Assessment[] =>
    assessment === null ? [] : [assessment];
  switch (reading.kind) {
    case 'companion':
    case 'pain-relief':
    case 'oral-fluid':
      return one(classifySupportiveCare(reading.kind, reading.given));
    case 'posture':
      return one(classifyPosture(reading.position));
    case 'fetal-heart-rate':
      return one(classifyFetalHeartRate(reading.beatsPerMinute, rules.fetalHeartRate));
    case 'decelerations':
      return one(classifyDecelerations(reading.type));
    case 'amniotic-fluid':
      return reading.state === 'absent'
        ? []
        : one(classifyAmnioticFluid(reading.state, rules.amnioticFluid, reading.meconiumGrade));
    case 'fetal-position':
      return one(classifyFetalPosition(reading.position));
    case 'caput':
      return one(classifyCaput(reading.grade, rules.caput));
    case 'moulding':
      return one(classifyMoulding(reading.grade, rules.moulding));
    case 'contractions':
      return one(
        classifyContractionAlerts(
          reading,
          rules.contractions,
          oxytocinRunningAt(readings, reading.time),
        ),
      );
    case 'pulse':
      return one(classifyPulse(reading.beatsPerMinute, rules.pulse));
    case 'blood-pressure':
      return one(classifyBloodPressure(reading.systolic, reading.diastolic, rules.bloodPressure));
    case 'temperature':
      return one(classifyTemperature(reading.celsius, rules.temperature));
    case 'urine':
      return classifyUrine(reading, rules.urine);
    case 'cervix':
    case 'descent':
    case 'oxytocin':
    case 'drug':
    case 'iv-fluid':
      return [];
  }
}

function buildRows(readings: readonly ChartedReading[]): LabourCareRows {
  const rows = Object.fromEntries(
    Object.entries(SECTIONS).map(([section, kinds]) => [
      section,
      Object.fromEntries(
        kinds.map((kind) => [kind, readings.filter((reading) => reading.kind === kind)]),
      ),
    ]),
  );
  return rows as unknown as LabourCareRows;
}

function buildStageGrid(
  readings: readonly ChartedReading[],
  start: number,
  chartStart: number,
  columnMinutes: number,
  minimumHours: number,
): LabourCareGrid {
  const lastColumn = readings.reduce((max, reading) => Math.max(max, reading.column), -1);
  return {
    columns: gridColumns(start, chartStart, columnMinutes, minimumHours, lastColumn),
    rows: buildRows(readings),
  };
}

function optionalInstant(value: Instant | null | undefined, now: number): number | null {
  if (value === undefined || value === null) return null;
  const time = parseInstant(value);
  return time === null || time > now ? null : time;
}

function validParity(parity: number | null | undefined): number | null {
  return typeof parity === 'number' && Number.isInteger(parity) && parity >= 0 && parity <= 30
    ? parity
    : null;
}

function nullableIso(time: number | null): string | null {
  return time === null ? null : toIsoString(time);
}

function findingAt(assessment: Assessment, time: number, chartStart: number): ChartedFinding {
  return {
    ...assessment,
    kind: 'cervix',
    at: toIsoString(time),
    hour: (time - chartStart) / MS_PER_HOUR,
  };
}

/** Builds the WHO Labour Care Guide from labour readings; bad readings are reported, never thrown. */
export function buildLabourCareGuide(input: LabourCareGuideInput): LabourCareGuide {
  const now = input.now === undefined ? Date.now() : requireInstant(input.now, 'now');
  const rules = resolveLabourCareGuideRules(input.rules);
  const normalized = normalizeReadings(input.readings, { notAfter: now });
  const { activePhaseFromCm, fullDilatationCm } = rules.cervix;
  const start = normalized.readings
    .filter(isCervix)
    .find((reading) => reading.dilatationCm >= activePhaseFromCm);
  if (start === undefined) return { status: 'not-started', issues: normalized.issues };

  const startedAt = start.time;
  const charted = normalized.readings.filter((reading) => reading.time >= startedAt);
  const issues: ReadingIssue[] = [
    ...normalized.issues,
    ...normalized.readings
      .filter((reading) => reading.time < startedAt)
      .map((reading) => ({
        index: reading.index,
        code: 'before-start' as const,
        ...(reading.id === undefined ? {} : { id: reading.id }),
      })),
  ].sort((a, b) => a.index - b.index);

  const parity = validParity(input.parity);
  const birthAt = optionalInstant(input.birthAt, now);
  const pushingAt = optionalInstant(input.pushingAt, now);
  const end = birthAt === null ? now : Math.max(startedAt, birthAt);
  const cervixReadings = charted.filter(isCervix);
  const full = cervixReadings.find((reading) => reading.dilatationCm >= fullDilatationCm);
  const cervix = centimetreProgress(cervixReadings, end, rules);
  const secondStage =
    full === undefined
      ? null
      : {
          ...secondStageProgress(full.time, Math.max(full.time, end), parity, rules),
          pushingAt: nullableIso(pushingAt),
        };

  const { chart } = rules;
  const firstStage = charted
    .filter((reading) => full === undefined || reading.time < full.time)
    .map((reading) => chartReading(reading, startedAt, chart.columnMinutes));
  const secondStageReadings =
    full === undefined
      ? []
      : charted
          .filter((reading) => reading.time >= full.time)
          .map((reading) =>
            chartReading(reading, startedAt, chart.secondStageColumnMinutes, full.time),
          );

  const findings: ChartedFinding[] = [
    ...charted.flatMap((reading) =>
      assess(reading, charted, rules).map((assessment) => ({
        ...assessment,
        kind: reading.kind,
        at: reading.at,
        hour: (reading.time - startedAt) / MS_PER_HOUR,
        ...(reading.id === undefined ? {} : { readingId: reading.id }),
      })),
    ),
    ...cervix
      .filter((level) => level.delayed)
      .map((level) =>
        findingAt(
          { code: 'cervix-progress-delayed', severity: 'watch' },
          Date.parse(level.alertAt),
          startedAt,
        ),
      ),
    ...(secondStage?.prolonged === true
      ? [
          findingAt(
            { code: 'second-stage-prolonged', severity: 'watch' },
            Date.parse(secondStage.alertAt),
            startedAt,
          ),
        ]
      : []),
  ].sort((a, b) => a.hour - b.hour);

  return {
    status: birthAt !== null ? 'birth' : full === undefined ? 'active-first-stage' : 'second-stage',
    header: {
      parity,
      labourOnsetAt: nullableIso(optionalInstant(input.labourOnsetAt, now)),
      activeLabourAt: start.at,
      membranesRupturedAt: nullableIso(optionalInstant(input.membranesRupturedAt, now)),
      riskFactors: (input.riskFactors ?? [])
        .filter((factor): factor is string => typeof factor === 'string')
        .map((factor) => factor.trim())
        .filter((factor) => factor !== ''),
      pushingAt: nullableIso(pushingAt),
      birthAt: nullableIso(birthAt),
    },
    now: toIsoString(now),
    cervix,
    progress: full === undefined ? (cervix.at(-1) ?? null) : null,
    secondStage,
    grid: {
      firstStage: buildStageGrid(
        firstStage,
        startedAt,
        startedAt,
        chart.columnMinutes,
        chart.minimumHours,
      ),
      secondStage:
        full === undefined
          ? null
          : buildStageGrid(
              secondStageReadings,
              full.time,
              startedAt,
              chart.secondStageColumnMinutes,
              chart.secondStageMinimumHours,
            ),
    },
    findings,
    due:
      birthAt === null
        ? scheduleChecks({
            readings: charted,
            startedAt,
            now,
            intervals: full === undefined ? rules.firstStageMinutes : rules.secondStageMinutes,
            kinds: CHECK_READING,
          })
        : [],
    issues,
  };
}
