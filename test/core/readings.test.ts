import { describe, expect, it } from 'vitest';
import { normalizeReadings } from '../../src/core/readings.js';
import type { Reading } from '../../src/core/types.js';

const at = '2026-01-10T08:00:00Z';
const time = Date.parse(at);

function single(reading: unknown) {
  return normalizeReadings([reading as Reading]);
}

describe('normalizeReadings', () => {
  it('keeps only known fields and resolves the time', () => {
    const { readings, issues } = single({
      kind: 'pulse',
      at,
      beatsPerMinute: 88,
      id: 'obs-1',
      extra: 'dropped',
    });
    expect(issues).toEqual([]);
    expect(readings).toEqual([
      {
        kind: 'pulse',
        beatsPerMinute: 88,
        id: 'obs-1',
        at: '2026-01-10T08:00:00.000Z',
        time,
        index: 0,
      },
    ]);
  });

  it('sorts by time', () => {
    const { readings } = normalizeReadings([
      { kind: 'pulse', at: '2026-01-10T09:00:00Z', beatsPerMinute: 90 },
      { kind: 'pulse', at, beatsPerMinute: 80 },
    ]);
    expect(readings.map((reading) => reading.index)).toEqual([1, 0]);
  });

  it.each([
    ['not an object', 'pulse', 'unknown-kind'],
    ['null', null, 'unknown-kind'],
    ['an unknown kind', { kind: 'weight', at, kg: 70 }, 'unknown-kind'],
    [
      'a time without a zone',
      { kind: 'pulse', at: '2026-01-10T08:00:00', beatsPerMinute: 80 },
      'invalid-time',
    ],
    ['a missing time', { kind: 'pulse', beatsPerMinute: 80 }, 'invalid-time'],
    ['a time of the wrong type', { kind: 'pulse', at: true, beatsPerMinute: 80 }, 'invalid-time'],
    [
      'a fetal heart rate of zero',
      { kind: 'fetal-heart-rate', at, beatsPerMinute: 0 },
      'invalid-value',
    ],
    ['an unknown liquor state', { kind: 'amniotic-fluid', at, state: 'green' }, 'invalid-value'],
    ['a moulding grade of 4', { kind: 'moulding', at, grade: 4 }, 'invalid-value'],
    ['a dilatation over 10 cm', { kind: 'cervix', at, dilatationCm: 11 }, 'invalid-value'],
    ['fractional fifths', { kind: 'descent', at, fifthsPalpable: 2.5 }, 'invalid-value'],
    [
      'fractional contractions',
      { kind: 'contractions', at, per10Minutes: 2.5, durationSeconds: 30 },
      'invalid-value',
    ],
    [
      'contractions without duration',
      { kind: 'contractions', at, per10Minutes: 3 },
      'invalid-value',
    ],
    [
      'a negative oxytocin rate',
      { kind: 'oxytocin', at, unitsPerLitre: 5, dropsPerMinute: -1 },
      'invalid-value',
    ],
    ['a drug without a name', { kind: 'drug', at, name: '  ' }, 'invalid-value'],
    [
      'a drug with an empty dose',
      { kind: 'drug', at, name: 'Oxytocin', dose: '' },
      'invalid-value',
    ],
    [
      'an IV fluid with a negative volume',
      { kind: 'iv-fluid', at, name: 'Ringer lactate', volumeMl: -5 },
      'invalid-value',
    ],
    [
      'diastolic above systolic',
      { kind: 'blood-pressure', at, systolic: 80, diastolic: 90 },
      'invalid-value',
    ],
    ['a temperature of 50 °C', { kind: 'temperature', at, celsius: 50 }, 'invalid-value'],
    ['an empty urine reading', { kind: 'urine', at }, 'invalid-value'],
    ['a urine protein of 5', { kind: 'urine', at, protein: 5 }, 'invalid-value'],
    ['a NaN pulse', { kind: 'pulse', at, beatsPerMinute: Number.NaN }, 'invalid-value'],
  ])('reports %s', (_, reading, code) => {
    const { readings, issues } = single(reading);
    expect(readings).toEqual([]);
    expect(issues).toEqual([{ index: 0, code }]);
  });

  it('keeps the caller id on an issue', () => {
    expect(single({ kind: 'pulse', at, beatsPerMinute: -1, id: 'obs-9' }).issues).toEqual([
      { index: 0, code: 'invalid-value', id: 'obs-9' },
    ]);
  });

  it('trims names and keeps optional fields only when given', () => {
    const { readings } = normalizeReadings([
      { kind: 'drug', at, name: ' Oxytocin ', dose: ' 10 IU ' },
      { kind: 'iv-fluid', at, name: 'Ringer lactate' },
      { kind: 'urine', at, protein: 0, volumeMl: 200 },
      { kind: 'urine', at, acetone: 2 },
    ]);
    expect(readings.map(({ time: _time, index: _index, at: _at, ...rest }) => rest)).toEqual([
      { kind: 'drug', name: 'Oxytocin', dose: '10 IU' },
      { kind: 'iv-fluid', name: 'Ringer lactate' },
      { kind: 'urine', acetone: 2 },
      { kind: 'urine', protein: 0, volumeMl: 200 },
    ]);
  });

  it('treats null optional fields as absent', () => {
    const { readings } = single({ kind: 'iv-fluid', at, name: 'Saline', volumeMl: null });
    expect(readings[0]).not.toHaveProperty('volumeMl');
  });

  it('keeps the first of two identical readings and reports the other', () => {
    const { readings, issues } = normalizeReadings([
      { kind: 'pulse', at, beatsPerMinute: 80, id: 'b' },
      { kind: 'pulse', at: time, beatsPerMinute: 80, id: 'a' },
    ]);
    expect(readings.map((reading) => reading.id)).toEqual(['a']);
    expect(issues).toEqual([{ index: 0, code: 'duplicate', id: 'b' }]);
  });

  it('reports a duplicate without an id', () => {
    const { issues } = normalizeReadings([
      { kind: 'pulse', at, beatsPerMinute: 80 },
      { kind: 'pulse', at, beatsPerMinute: 80 },
    ]);
    expect(issues).toEqual([{ index: 1, code: 'duplicate' }]);
  });

  it('reports readings after notAfter as in the future', () => {
    const { readings, issues } = normalizeReadings(
      [
        { kind: 'pulse', at, beatsPerMinute: 80 },
        { kind: 'pulse', at: time + 1, beatsPerMinute: 80 },
      ],
      { notAfter: time },
    );
    expect(readings).toHaveLength(1);
    expect(issues).toEqual([{ index: 1, code: 'in-future' }]);
  });

  it('accepts every reading kind', () => {
    const all: Reading[] = [
      { kind: 'fetal-heart-rate', at, beatsPerMinute: 140 },
      { kind: 'amniotic-fluid', at, state: 'clear' },
      { kind: 'moulding', at, grade: 1 },
      { kind: 'cervix', at, dilatationCm: 5 },
      { kind: 'descent', at, fifthsPalpable: 3 },
      { kind: 'contractions', at, per10Minutes: 3, durationSeconds: 45 },
      { kind: 'oxytocin', at, unitsPerLitre: 5, dropsPerMinute: 10 },
      { kind: 'drug', at, name: 'Pethidine' },
      { kind: 'iv-fluid', at, name: 'Saline', volumeMl: 500 },
      { kind: 'pulse', at, beatsPerMinute: 84 },
      { kind: 'blood-pressure', at, systolic: 120, diastolic: 80 },
      { kind: 'temperature', at, celsius: 36.8 },
      { kind: 'urine', at, protein: 0, acetone: 0, volumeMl: 150 },
    ];
    const { readings, issues } = normalizeReadings(all);
    expect(issues).toEqual([]);
    expect(readings).toHaveLength(all.length);
  });
});
