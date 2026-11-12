import type { Assessment, CervixReading, ReadingIssue, TimedReading } from '../core/types.js';
import { MS_PER_HOUR, hoursBetween, requireInstant, toIsoString } from '../core/time.js';
import { normalizeReadings } from '../core/readings.js';
import { classifyAmnioticFluid, classifyFetalHeartRate, classifyMoulding } from '../core/fetal.js';
import {
  classifyBloodPressure,
  classifyPulse,
  classifyTemperature,
  classifyUrine,
} from '../core/maternal.js';
import { classifyContractions } from '../core/contractions.js';
import { actionLine, actionLineHourAt, alertLine, alertLineHourAt, cervixZone } from './lines.js';
import { resolvePartographRules, type PartographRules } from './rules.js';
import { dueChecks } from './schedule.js';
import { buildGrid, chartReading } from './grid.js';
import type {
  CervixPoint,
  CervixProgress,
  ChartedFinding,
  ChartedReading,
  Partograph,
  PartographInput,
} from './types.js';

type CervixTimedReading = TimedReading & { readonly kind: 'cervix' };

function isCervix(reading: TimedReading): reading is CervixTimedReading {
  return reading.kind === 'cervix';
}

function oxytocinRunningAt(readings: readonly TimedReading[], time: number): boolean {
  let running = false;
  for (const reading of readings) {
    if (reading.time > time) break;
    if (reading.kind === 'oxytocin') running = reading.dropsPerMinute > 0;
  }
  return running;
}

function assess(
  reading: TimedReading,
  readings: readonly TimedReading[],
  rules: PartographRules,
): readonly Assessment[] {
  const one = (assessment: Assessment | null): readonly Assessment[] =>
    assessment === null ? [] : [assessment];
  switch (reading.kind) {
    case 'fetal-heart-rate':
      return one(classifyFetalHeartRate(reading.beatsPerMinute, rules.fetalHeartRate));
    case 'amniotic-fluid':
      return one(classifyAmnioticFluid(reading.state));
    case 'moulding':
      return one(classifyMoulding(reading.grade, rules.moulding));
    case 'contractions':
      return one(
        classifyContractions(
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

function finding(assessment: Assessment, reading: ChartedReading): ChartedFinding {
  return {
    ...assessment,
    kind: reading.kind,
    at: reading.at,
    hour: reading.hour,
    ...(reading.id === undefined ? {} : { readingId: reading.id }),
  };
}

function lineFindings(points: readonly CervixPoint[]): ChartedFinding[] {
  const findings: ChartedFinding[] = [];
  const alert = points.find((point) => point.zone !== 'left-of-alert-line');
  if (alert) findings.push(finding({ code: 'alert-line-crossed', severity: 'watch' }, alert));
  const action = points.find((point) => point.zone === 'right-of-action-line');
  if (action) findings.push(finding({ code: 'action-line-crossed', severity: 'urgent' }, action));
  return findings;
}

/** Builds the WHO modified partograph from labour readings; bad readings are reported, never thrown. */
export function buildPartograph(input: PartographInput): Partograph {
  const now = input.now === undefined ? Date.now() : requireInstant(input.now, 'now');
  const rules = resolvePartographRules(input.rules);
  const normalized = normalizeReadings(input.readings, { notAfter: now });
  const { cervix: cervixRules } = rules;
  const start = normalized.readings
    .filter(isCervix)
    .find((reading) => reading.dilatationCm >= cervixRules.activePhaseFromCm);
  if (start === undefined) return { status: 'not-started', issues: normalized.issues };

  const startedAt = start.time;
  const startCm = start.dilatationCm;
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

  const cervixReadings = charted.filter(isCervix);
  const fullyDilated = cervixReadings.find(
    (reading) => reading.dilatationCm >= cervixRules.fullDilatationCm,
  );
  const chartedReadings = charted.map((reading) =>
    chartReading(reading, startedAt, rules.chart.columnMinutes),
  );
  const cervix: CervixPoint[] = chartedReadings
    .filter((reading): reading is ChartedReading<CervixReading> => reading.kind === 'cervix')
    .map((point) => ({ ...point, zone: cervixZone(point, startCm, cervixRules) }));

  const findings = [
    ...charted.flatMap((reading) => {
      const placed = chartReading(reading, startedAt, rules.chart.columnMinutes);
      return assess(reading, charted, rules).map((assessment) => finding(assessment, placed));
    }),
    ...lineFindings(cervix),
  ].sort((a, b) => a.hour - b.hour);

  const latest = cervix.at(-1);
  const progress: CervixProgress | null =
    latest === undefined || fullyDilated !== undefined
      ? null
      : {
          at: latest.at,
          dilatationCm: latest.dilatationCm,
          zone: latest.zone,
          zoneNow: cervixZone(
            { hour: hoursBetween(startedAt, now), dilatationCm: latest.dilatationCm },
            startCm,
            cervixRules,
          ),
          alertLineReachedAt: toIsoString(
            startedAt + alertLineHourAt(latest.dilatationCm, startCm, cervixRules) * MS_PER_HOUR,
          ),
          actionLineReachedAt: toIsoString(
            startedAt + actionLineHourAt(latest.dilatationCm, startCm, cervixRules) * MS_PER_HOUR,
          ),
        };

  return {
    status: fullyDilated === undefined ? 'active-phase' : 'fully-dilated',
    startedAt: start.at,
    fullyDilatedAt: fullyDilated?.at ?? null,
    now: toIsoString(now),
    alertLine: alertLine(startCm, cervixRules),
    actionLine: actionLine(startCm, cervixRules),
    cervix,
    progress,
    grid: buildGrid(chartedReadings, startedAt, rules.chart),
    findings,
    due: dueChecks({
      readings: charted,
      startedAt,
      now,
      intervals: fullyDilated === undefined ? rules.firstStageMinutes : rules.secondStageMinutes,
    }),
    issues,
  };
}
