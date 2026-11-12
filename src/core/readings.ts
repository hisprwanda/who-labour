import type {
  AmnioticFluid,
  DistributiveOmit,
  Instant,
  Reading,
  ReadingIssue,
  ReadingIssueCode,
  ReadingKind,
  TimedReading,
} from './types.js';
import { parseInstant, toIsoString } from './time.js';

type Fields = Readonly<Partial<Record<string, unknown>>>;
type Payload = DistributiveOmit<Reading, 'at' | 'id'>;
type PayloadOf<K extends ReadingKind> = Extract<Payload, { readonly kind: K }>;
type Parse<T> = (value: unknown) => T | null;

/** Options for `normalizeReadings`. */
export interface NormalizeOptions {
  readonly notAfter?: number;
}

/** Valid readings sorted by time, and the readings left out with why. */
export interface NormalizedReadings {
  readonly readings: readonly TimedReading[];
  readonly issues: readonly ReadingIssue[];
}

const AMNIOTIC_FLUID_STATES: readonly AmnioticFluid[] = [
  'intact',
  'ruptured',
  'clear',
  'meconium',
  'blood',
  'absent',
];

const number =
  (min: number, max: number): Parse<number> =>
  (value) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
      ? value
      : null;

const integer =
  <T extends number>(min: number, max: number): Parse<T> =>
  (value) =>
    Number.isInteger(value) && (value as number) >= min && (value as number) <= max
      ? (value as T)
      : null;

const oneOf =
  <T extends string>(values: readonly T[]): Parse<T> =>
  (value) =>
    values.find((candidate) => candidate === value) ?? null;

const text: Parse<string> = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

function optional<T>(value: unknown, parse: Parse<T>): T | undefined | null {
  return value === undefined || value === null ? undefined : parse(value);
}

const PARSERS: { readonly [K in ReadingKind]: (fields: Fields) => PayloadOf<K> | null } = {
  'fetal-heart-rate': ({ beatsPerMinute }) => {
    const bpm = number(1, 300)(beatsPerMinute);
    return bpm === null ? null : { kind: 'fetal-heart-rate', beatsPerMinute: bpm };
  },
  'amniotic-fluid': ({ state }) => {
    const value = oneOf(AMNIOTIC_FLUID_STATES)(state);
    return value === null ? null : { kind: 'amniotic-fluid', state: value };
  },
  moulding: ({ grade }) => {
    const value = integer<0 | 1 | 2 | 3>(0, 3)(grade);
    return value === null ? null : { kind: 'moulding', grade: value };
  },
  cervix: ({ dilatationCm }) => {
    const value = number(0, 10)(dilatationCm);
    return value === null ? null : { kind: 'cervix', dilatationCm: value };
  },
  descent: ({ fifthsPalpable }) => {
    const value = integer<0 | 1 | 2 | 3 | 4 | 5>(0, 5)(fifthsPalpable);
    return value === null ? null : { kind: 'descent', fifthsPalpable: value };
  },
  contractions: ({ per10Minutes, durationSeconds }) => {
    const count = integer(0, 10)(per10Minutes);
    const duration = number(0, 300)(durationSeconds);
    return count === null || duration === null
      ? null
      : { kind: 'contractions', per10Minutes: count, durationSeconds: duration };
  },
  oxytocin: ({ unitsPerLitre, dropsPerMinute }) => {
    const units = number(0, 100)(unitsPerLitre);
    const drops = number(0, 200)(dropsPerMinute);
    return units === null || drops === null
      ? null
      : { kind: 'oxytocin', unitsPerLitre: units, dropsPerMinute: drops };
  },
  drug: ({ name, dose }) => {
    const drugName = text(name);
    const drugDose = optional(dose, text);
    if (drugName === null || drugDose === null) return null;
    return { kind: 'drug', name: drugName, ...(drugDose === undefined ? {} : { dose: drugDose }) };
  },
  'iv-fluid': ({ name, volumeMl }) => {
    const fluidName = text(name);
    const volume = optional(volumeMl, number(0, 10_000));
    if (fluidName === null || volume === null) return null;
    return {
      kind: 'iv-fluid',
      name: fluidName,
      ...(volume === undefined ? {} : { volumeMl: volume }),
    };
  },
  pulse: ({ beatsPerMinute }) => {
    const bpm = number(1, 300)(beatsPerMinute);
    return bpm === null ? null : { kind: 'pulse', beatsPerMinute: bpm };
  },
  'blood-pressure': ({ systolic, diastolic }) => {
    const high = number(1, 300)(systolic);
    const low = number(1, 300)(diastolic);
    return high === null || low === null || low >= high
      ? null
      : { kind: 'blood-pressure', systolic: high, diastolic: low };
  },
  temperature: ({ celsius }) => {
    const value = number(25, 45)(celsius);
    return value === null ? null : { kind: 'temperature', celsius: value };
  },
  urine: ({ protein, acetone, volumeMl }) => {
    const proteinGrade = optional(protein, integer<0 | 1 | 2 | 3 | 4>(0, 4));
    const acetoneGrade = optional(acetone, integer<0 | 1 | 2 | 3 | 4>(0, 4));
    const volume = optional(volumeMl, number(0, 5_000));
    if (proteinGrade === null || acetoneGrade === null || volume === null) return null;
    if (proteinGrade === undefined && acetoneGrade === undefined && volume === undefined)
      return null;
    return {
      kind: 'urine',
      ...(proteinGrade === undefined ? {} : { protein: proteinGrade }),
      ...(acetoneGrade === undefined ? {} : { acetone: acetoneGrade }),
      ...(volume === undefined ? {} : { volumeMl: volume }),
    };
  },
};

function isReadingKind(kind: unknown): kind is ReadingKind {
  return typeof kind === 'string' && Object.hasOwn(PARSERS, kind);
}

function isInstant(value: unknown): value is Instant {
  return value instanceof Date || typeof value === 'number' || typeof value === 'string';
}

function parsePayload<K extends ReadingKind>(kind: K, fields: Fields): PayloadOf<K> | null {
  return PARSERS[kind](fields);
}

type Checked =
  | { readonly ok: true; readonly reading: TimedReading; readonly key: string }
  | { readonly ok: false; readonly code: ReadingIssueCode; readonly id?: string };

function check(input: unknown, index: number, notAfter: number | undefined): Checked {
  if (typeof input !== 'object' || input === null) return { ok: false, code: 'unknown-kind' };
  const fields = input as Fields;
  const id = typeof fields['id'] === 'string' ? fields['id'] : undefined;
  const withId = id === undefined ? {} : { id };
  const kind = fields['kind'];
  if (!isReadingKind(kind)) return { ok: false, code: 'unknown-kind', ...withId };
  const at = fields['at'];
  const time = isInstant(at) ? parseInstant(at) : null;
  if (time === null) return { ok: false, code: 'invalid-time', ...withId };
  const payload = parsePayload(kind, fields);
  if (payload === null) return { ok: false, code: 'invalid-value', ...withId };
  if (notAfter !== undefined && time > notAfter) return { ok: false, code: 'in-future', ...withId };
  const reading = { ...payload, ...withId, at: toIsoString(time), time, index } as TimedReading;
  return { ok: true, reading, key: `${String(time)}|${JSON.stringify(payload)}` };
}

function compareKeys(a: { readonly key: string }, b: { readonly key: string }): number {
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/** Validates readings, drops duplicates and sorts the rest by time; never throws on bad clinical data. */
export function normalizeReadings(
  readings: readonly Reading[],
  options: NormalizeOptions = {},
): NormalizedReadings {
  const inputs: readonly unknown[] = readings;
  const issues: ReadingIssue[] = [];
  const accepted: { readonly key: string; readonly reading: TimedReading }[] = [];
  inputs.forEach((input, index) => {
    const result = check(input, index, options.notAfter);
    if (result.ok) accepted.push({ key: result.key, reading: result.reading });
    else
      issues.push({
        index,
        code: result.code,
        ...(result.id === undefined ? {} : { id: result.id }),
      });
  });
  accepted.sort(
    (a, b) =>
      a.reading.time - b.reading.time ||
      compareKeys(a, b) ||
      (a.reading.id ?? '').localeCompare(b.reading.id ?? ''),
  );
  const seen = new Set<string>();
  const kept: TimedReading[] = [];
  for (const { key, reading } of accepted) {
    if (seen.has(key)) {
      issues.push({
        index: reading.index,
        code: 'duplicate',
        ...(reading.id === undefined ? {} : { id: reading.id }),
      });
      continue;
    }
    seen.add(key);
    kept.push(reading);
  }
  issues.sort((a, b) => a.index - b.index);
  return { readings: kept, issues };
}
