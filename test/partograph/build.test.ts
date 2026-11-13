import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Reading } from '../../src/core/types.js';
import { buildPartograph } from '../../src/partograph/build.js';
import type { Partograph, StartedPartograph } from '../../src/partograph/types.js';
import { START, hour } from '../helpers.js';

function started(partograph: Partograph): StartedPartograph {
  if (partograph.status === 'not-started') throw new Error('expected a started partograph');
  return partograph;
}

function cervix(hours: number, dilatationCm: number, id?: string): Reading {
  return { kind: 'cervix', at: hour(hours), dilatationCm, ...(id === undefined ? {} : { id }) };
}

function codes(partograph: StartedPartograph): string[] {
  return partograph.findings.map((finding) => finding.code);
}

describe('buildPartograph scenarios', () => {
  it('charts a normal labour that stays left of the alert line', () => {
    const partograph = started(
      buildPartograph({
        readings: [cervix(0, 4), cervix(2, 6), cervix(4, 8), cervix(6, 10)],
        now: hour(6.5),
      }),
    );
    expect(partograph.status).toBe('fully-dilated');
    expect(partograph.startedAt).toBe(hour(0));
    expect(partograph.fullyDilatedAt).toBe(hour(6));
    expect(partograph.cervix.map((point) => point.zone)).toEqual(
      Array(4).fill('left-of-alert-line'),
    );
    expect(partograph.findings).toEqual([]);
    expect(partograph.progress).toBeNull();
  });

  it('flags the alert line when progress falls behind 1 cm per hour', () => {
    const partograph = started(
      buildPartograph({ readings: [cervix(0, 4), cervix(4, 5, 'exam-2')], now: hour(4) }),
    );
    expect(partograph.cervix.at(-1)?.zone).toBe('between-lines');
    expect(partograph.findings).toEqual([
      {
        code: 'alert-line-crossed',
        severity: 'watch',
        kind: 'cervix',
        at: hour(4),
        hour: 4,
        readingId: 'exam-2',
      },
    ]);
  });

  it('crosses the action line after 4 hours without progress', () => {
    const partograph = started(
      buildPartograph({ readings: [cervix(0, 4), cervix(4, 4)], now: hour(4) }),
    );
    expect(partograph.findings.map(({ code, severity }) => ({ code, severity }))).toEqual([
      { code: 'alert-line-crossed', severity: 'watch' },
      { code: 'action-line-crossed', severity: 'urgent' },
    ]);
  });

  it('keeps the printed lines and plots a 7 cm admission on the alert line', () => {
    const partograph = started(
      buildPartograph({ readings: [cervix(0, 7), cervix(2, 8)], now: hour(2) }),
    );
    expect(partograph.alertLine).toEqual({
      start: { hour: 0, dilatationCm: 4 },
      end: { hour: 6, dilatationCm: 10 },
    });
    expect(partograph.actionLine).toEqual({
      start: { hour: 4, dilatationCm: 4 },
      end: { hour: 10, dilatationCm: 10 },
    });
    expect(partograph.startedAt).toBe(hour(0));
    expect(partograph.cervix.map(({ hour: at, column, zone }) => [at, column, zone])).toEqual([
      [3, 6, 'left-of-alert-line'],
      [5, 10, 'between-lines'],
    ]);
    expect(partograph.grid.columns[6]).toEqual({ index: 6, hour: 3, from: hour(0), to: hour(0.5) });
    expect(partograph.progress).toMatchObject({
      alertLineReachedAt: hour(1),
      actionLineReachedAt: hour(5),
    });
  });

  it('plots an admission between whole centimetres on the alert line', () => {
    const partograph = started(
      buildPartograph({ readings: [cervix(0, 5.5), cervix(4, 7.5)], now: hour(4) }),
    );
    expect(partograph.cervix.map(({ hour: at, zone }) => [at, zone])).toEqual([
      [1.5, 'left-of-alert-line'],
      [5.5, 'between-lines'],
    ]);
  });

  it('starts the lines from an overridden active phase', () => {
    const partograph = started(
      buildPartograph({
        readings: [cervix(0, 6), cervix(1, 7)],
        now: hour(1),
        rules: { cervix: { activePhaseFromCm: 5 } },
      }),
    );
    expect(partograph.alertLine.start).toEqual({ hour: 0, dilatationCm: 5 });
    expect(partograph.cervix.map((point) => point.hour)).toEqual([1, 2]);
  });

  it('does not start before the active phase', () => {
    expect(
      buildPartograph({
        readings: [cervix(0, 3), { kind: 'pulse', at: hour(0), beatsPerMinute: 80 }],
        now: hour(1),
      }),
    ).toEqual({ status: 'not-started', issues: [] });
  });

  it('starts at the first active-phase exam and reports earlier readings', () => {
    const partograph = started(
      buildPartograph({
        readings: [
          cervix(0, 3, 'latent'),
          { kind: 'pulse', at: hour(1), beatsPerMinute: 80 },
          cervix(4, 4),
          { kind: 'pulse', at: hour(5), beatsPerMinute: 82 },
        ],
        now: hour(5),
      }),
    );
    expect(partograph.startedAt).toBe(hour(4));
    expect(partograph.issues).toEqual([
      { index: 0, code: 'before-start', id: 'latent' },
      { index: 1, code: 'before-start' },
    ]);
    expect(partograph.grid.rows.pulse.map((reading) => reading.hour)).toEqual([1]);
  });

  it('reports invalid and future readings without throwing', () => {
    const partograph = started(
      buildPartograph({
        readings: [
          cervix(0, 4),
          { kind: 'pulse', at: hour(1), beatsPerMinute: -5 },
          { kind: 'pulse', at: hour(3), beatsPerMinute: 80 },
        ],
        now: hour(2),
      }),
    );
    expect(partograph.issues).toEqual([
      { index: 1, code: 'invalid-value' },
      { index: 2, code: 'in-future' },
    ]);
  });

  it('tells when the lines will pass the latest dilatation and where labour is now', () => {
    const partograph = started(
      buildPartograph({ readings: [cervix(0, 4), cervix(1, 5)], now: hour(6) }),
    );
    expect(partograph.progress).toEqual({
      at: hour(1),
      dilatationCm: 5,
      zone: 'left-of-alert-line',
      zoneNow: 'right-of-action-line',
      alertLineReachedAt: hour(1),
      actionLineReachedAt: hour(5),
    });
  });

  it('turns every abnormal reading into a finding at its time', () => {
    const partograph = started(
      buildPartograph({
        readings: [
          cervix(0, 4),
          { kind: 'fetal-heart-rate', at: hour(0.5), beatsPerMinute: 95, id: 'fhr' },
          { kind: 'amniotic-fluid', at: hour(0), state: 'meconium' },
          { kind: 'moulding', at: hour(0), grade: 3 },
          { kind: 'pulse', at: hour(1), beatsPerMinute: 125 },
          { kind: 'blood-pressure', at: hour(1), systolic: 165, diastolic: 100 },
          { kind: 'temperature', at: hour(1), celsius: 38 },
          { kind: 'urine', at: hour(1), protein: 2, acetone: 2 },
          { kind: 'descent', at: hour(1), fifthsPalpable: 3 },
          { kind: 'drug', at: hour(1), name: 'Pethidine' },
          { kind: 'iv-fluid', at: hour(1), name: 'Saline' },
        ],
        now: hour(1),
      }),
    );
    expect(partograph.findings.map(({ code, severity, hour: at }) => [code, severity, at])).toEqual(
      [
        ['meconium-stained-liquor', 'watch', 0],
        ['moulding-severe', 'watch', 0],
        ['fetal-heart-rate-low', 'urgent', 0.5],
        ['blood-pressure-severe', 'urgent', 1],
        ['pulse-high', 'watch', 1],
        ['temperature-high', 'watch', 1],
        ['proteinuria', 'watch', 1],
        ['ketonuria', 'watch', 1],
      ],
    );
    expect(partograph.findings[2]?.readingId).toBe('fhr');
  });

  it('makes excessive contractions urgent only while oxytocin is running', () => {
    const contractions = (hours: number): Reading => ({
      kind: 'contractions',
      at: hour(hours),
      per10Minutes: 6,
      durationSeconds: 50,
    });
    const partograph = started(
      buildPartograph({
        readings: [
          cervix(0, 4),
          contractions(0.5),
          { kind: 'oxytocin', at: hour(1), unitsPerLitre: 5, dropsPerMinute: 15 },
          contractions(1.5),
          { kind: 'oxytocin', at: hour(2), unitsPerLitre: 5, dropsPerMinute: 0 },
          contractions(2.5),
        ],
        now: hour(3),
      }),
    );
    expect(partograph.findings.map((finding) => finding.severity)).toEqual([
      'watch',
      'urgent',
      'watch',
    ]);
  });

  it('switches to second-stage monitoring once fully dilated', () => {
    const partograph = started(
      buildPartograph({
        readings: [
          cervix(0, 6),
          cervix(3, 10),
          { kind: 'fetal-heart-rate', at: hour(3), beatsPerMinute: 140 },
        ],
        now: hour(3.25),
      }),
    );
    const fetal = partograph.due.find((check) => check.check === 'fetal-heart-rate');
    expect(fetal).toMatchObject({ intervalMinutes: 5, minutesOverdue: 10 });
    expect(partograph.due.map((check) => check.check)).not.toContain('vaginal-exam');
  });

  it('lays out a 12-hour grid of half-hour columns, longer when readings go past it', () => {
    const short = started(buildPartograph({ readings: [cervix(0, 4)], now: hour(1) }));
    expect(short.grid.columns).toHaveLength(24);
    expect(short.grid.columns[1]).toEqual({ index: 1, hour: 0.5, from: hour(0.5), to: hour(1) });

    const long = started(
      buildPartograph({
        readings: [cervix(0, 4), { kind: 'pulse', at: hour(13.25), beatsPerMinute: 80 }],
        now: hour(14),
      }),
    );
    expect(long.grid.columns).toHaveLength(27);
    expect(long.grid.rows.pulse[0]).toEqual({
      kind: 'pulse',
      beatsPerMinute: 80,
      at: hour(13.25),
      hour: 13.25,
      column: 26,
    });
  });

  it('applies rule overrides', () => {
    const partograph = started(
      buildPartograph({
        readings: [cervix(0, 4), cervix(2, 4)],
        now: hour(2),
        rules: { cervix: { actionLineAfterHours: 2 } },
      }),
    );
    expect(codes(partograph)).toContain('action-line-crossed');
  });

  it('accepts Date and epoch milliseconds for now', () => {
    const readings = [cervix(0, 4)];
    expect(started(buildPartograph({ readings, now: new Date(START) })).now).toBe(hour(0));
    expect(started(buildPartograph({ readings, now: START })).now).toBe(hour(0));
  });

  it('defaults now to the current time', () => {
    const partograph = started(buildPartograph({ readings: [cervix(0, 4)] }));
    expect(Date.parse(partograph.now)).toBeGreaterThan(START);
  });

  it('throws a TypeError for an invalid now', () => {
    expect(() => buildPartograph({ readings: [], now: '2026-01-10 08:00' })).toThrow(TypeError);
  });
});

const arbitraryReading: fc.Arbitrary<Reading> = fc.oneof(
  fc.record({
    kind: fc.constant('fetal-heart-rate' as const),
    at: fc.integer({ min: 0, max: 40 }).map((step) => hour(step / 4)),
    beatsPerMinute: fc.integer({ min: 80, max: 200 }),
  }),
  fc.record({
    kind: fc.constant('cervix' as const),
    at: fc.integer({ min: 0, max: 40 }).map((step) => hour(step / 4)),
    dilatationCm: fc.integer({ min: 2, max: 10 }),
  }),
  fc.record({
    kind: fc.constant('pulse' as const),
    at: fc.integer({ min: 0, max: 40 }).map((step) => hour(step / 4)),
    beatsPerMinute: fc.integer({ min: 50, max: 140 }),
  }),
  fc.record({
    kind: fc.constant('contractions' as const),
    at: fc.integer({ min: 0, max: 40 }).map((step) => hour(step / 4)),
    per10Minutes: fc.integer({ min: 0, max: 7 }),
    durationSeconds: fc.integer({ min: 10, max: 80 }),
  }),
);

function withoutIssues(partograph: Partograph): Omit<Partograph, 'issues'> {
  const { issues: _issues, ...rest } = partograph;
  return rest;
}

describe('buildPartograph properties', () => {
  it('gives the same chart whatever order the readings come in', () => {
    fc.assert(
      fc.property(
        fc
          .array(arbitraryReading, { maxLength: 30 })
          .chain((readings) =>
            fc.tuple(
              fc.constant(readings),
              fc.shuffledSubarray(readings, { minLength: readings.length }),
            ),
          ),
        ([readings, shuffled]) => {
          expect(withoutIssues(buildPartograph({ readings: shuffled, now: hour(10) }))).toEqual(
            withoutIssues(buildPartograph({ readings, now: hour(10) })),
          );
        },
      ),
    );
  });

  it('never loses a finding when a normal fetal heart rate is added', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryReading, { maxLength: 30 }),
        fc.integer({ min: 0, max: 40 }),
        (readings, step) => {
          const before = buildPartograph({ readings, now: hour(10) });
          const after = buildPartograph({
            readings: [
              ...readings,
              { kind: 'fetal-heart-rate', at: hour(step / 4), beatsPerMinute: 140 },
            ],
            now: hour(10),
          });
          if (before.status === 'not-started') return;
          expect(started(after).findings).toEqual(expect.arrayContaining([...before.findings]));
        },
      ),
    );
  });
});
