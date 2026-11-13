import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Reading } from '../../src/core/types.js';
import { buildLabourCareGuide } from '../../src/lcg/build.js';
import type {
  LabourCareGuide,
  LabourCareGuideInput,
  StartedLabourCareGuide,
} from '../../src/lcg/types.js';
import { START, hour } from '../helpers.js';

function started(guide: LabourCareGuide): StartedLabourCareGuide {
  if (guide.status === 'not-started') throw new Error('expected a started guide');
  return guide;
}

function build(input: Partial<LabourCareGuideInput> & { readonly now: string }) {
  return started(buildLabourCareGuide({ readings: [], parity: 1, ...input }));
}

function cervix(hours: number, dilatationCm: number, id?: string): Reading {
  return { kind: 'cervix', at: hour(hours), dilatationCm, ...(id === undefined ? {} : { id }) };
}

function codes(guide: StartedLabourCareGuide): string[] {
  return guide.findings.map((finding) => finding.code);
}

describe('buildLabourCareGuide start', () => {
  it('waits for a cervix of 5 cm and reports nothing charted', () => {
    const guide = buildLabourCareGuide({ readings: [cervix(0, 4)], now: hour(1) });
    expect(guide).toEqual({ status: 'not-started', issues: [] });
  });

  it('starts at the first exam of 5 cm or more and lists earlier readings', () => {
    const guide = build({
      readings: [cervix(0, 4, 'latent'), cervix(3, 5)],
      now: hour(4),
    });
    expect(guide.status).toBe('active-first-stage');
    expect(guide.header.activeLabourAt).toBe(hour(3));
    expect(guide.issues).toEqual([{ index: 0, code: 'before-start', id: 'latent' }]);
  });

  it('passes episode facts through to the header', () => {
    const guide = build({
      readings: [cervix(0, 5)],
      parity: 0,
      labourOnsetAt: hour(-6),
      membranesRupturedAt: new Date(START - 3_600_000),
      riskFactors: [' anaemia ', '', 'previous caesarean'],
      now: hour(1),
    });
    expect(guide.header).toEqual({
      parity: 0,
      labourOnsetAt: hour(-6),
      activeLabourAt: hour(0),
      membranesRupturedAt: hour(-1),
      riskFactors: ['anaemia', 'previous caesarean'],
      pushingAt: null,
      birthAt: null,
    });
  });

  it('sets invalid or future episode facts to null instead of throwing', () => {
    const guide = build({
      readings: [cervix(0, 5)],
      parity: -1,
      labourOnsetAt: '2026-01-10 02:00',
      membranesRupturedAt: hour(5),
      now: hour(1),
    });
    expect(guide.header).toMatchObject({
      parity: null,
      labourOnsetAt: null,
      membranesRupturedAt: null,
      riskFactors: [],
    });
  });

  it('throws a TypeError for an invalid now', () => {
    expect(() => buildLabourCareGuide({ readings: [], now: 'yesterday' })).toThrow(TypeError);
  });

  it('defaults now to the current time', () => {
    const guide = started(buildLabourCareGuide({ readings: [cervix(0, 5)] }));
    expect(Date.parse(guide.now)).toBeGreaterThan(START);
  });
});

describe('time spent at each centimetre', () => {
  it.each([
    [5, 6],
    [6, 5],
    [7, 3],
    [8, 2.5],
    [9, 2],
  ])('alerts at %i cm after %f hours without progress', (cm, limit) => {
    const before = build({ readings: [cervix(0, cm)], now: hour(limit - 0.1) });
    expect(codes(before)).toEqual([]);
    expect(before.progress).toMatchObject({ dilatationCm: cm, delayed: false });

    const at = build({ readings: [cervix(0, cm, 'exam-1')], now: hour(limit) });
    expect(at.findings).toEqual([
      {
        code: 'cervix-progress-delayed',
        severity: 'watch',
        kind: 'cervix',
        at: hour(limit),
        hour: limit,
      },
    ]);
    expect(at.progress).toEqual({
      dilatationCm: cm,
      reachedAt: hour(0),
      leftAt: null,
      hours: limit,
      limitHours: limit,
      alertAt: hour(limit),
      delayed: true,
    });
  });

  it('charts a normal labour with no delay', () => {
    const guide = build({
      readings: [cervix(0, 5), cervix(4, 7), cervix(6, 9), cervix(7, 10)],
      now: hour(7.5),
    });
    expect(guide.status).toBe('second-stage');
    expect(
      guide.cervix.map(({ dilatationCm, hours, delayed }) => [dilatationCm, hours, delayed]),
    ).toEqual([
      [5, 4, false],
      [7, 2, false],
      [9, 1, false],
    ]);
    expect(guide.progress).toBeNull();
    expect(guide.findings).toEqual([]);
  });

  it('flags a delay seen only at the next exam, at the time the limit was reached', () => {
    const guide = build({ readings: [cervix(0, 7), cervix(4, 8)], now: hour(4) });
    expect(guide.cervix[0]).toMatchObject({
      dilatationCm: 7,
      leftAt: hour(4),
      hours: 4,
      delayed: true,
    });
    expect(guide.findings).toMatchObject([
      { code: 'cervix-progress-delayed', at: hour(3), hour: 3 },
    ]);
    expect(guide.progress).toMatchObject({ dilatationCm: 8, delayed: false, alertAt: hour(6.5) });
  });

  it('counts a fractional dilatation at its whole centimetre', () => {
    const guide = build({ readings: [cervix(0, 5), cervix(1, 5.5), cervix(2, 6.5)], now: hour(2) });
    expect(guide.cervix.map((level) => [level.dilatationCm, level.reachedAt])).toEqual([
      [5, hour(0)],
      [6, hour(2)],
    ]);
  });

  it('does not reset the clock when a later exam reads lower', () => {
    const guide = build({ readings: [cervix(0, 7), cervix(2, 6)], now: hour(3) });
    expect(guide.cervix).toHaveLength(1);
    expect(guide.progress).toMatchObject({ dilatationCm: 7, reachedAt: hour(0), delayed: true });
  });

  it('only lists the centimetres actually examined', () => {
    const guide = build({ readings: [cervix(0, 5), cervix(3, 8)], now: hour(3) });
    expect(guide.cervix.map((level) => level.dilatationCm)).toEqual([5, 8]);
  });
});

describe('second stage', () => {
  it.each([
    [0, 3],
    [1, 2],
    [4, 2],
    [null, 2],
  ])('with parity %s alerts after %i hours', (parity, limit) => {
    const before = build({
      readings: [cervix(0, 9), cervix(1, 10)],
      parity,
      now: hour(1 + limit - 0.25),
    });
    expect(before.secondStage).toMatchObject({ limitHours: limit, prolonged: false });
    const after = build({ readings: [cervix(0, 9), cervix(1, 10)], parity, now: hour(1 + limit) });
    expect(after.secondStage).toEqual({
      startedAt: hour(1),
      pushingAt: null,
      hours: limit,
      limitHours: limit,
      alertAt: hour(1 + limit),
      prolonged: true,
    });
    expect(after.findings).toMatchObject([
      { code: 'second-stage-prolonged', severity: 'watch', kind: 'cervix', at: hour(1 + limit) },
    ]);
  });

  it('records when pushing began without raising an alert', () => {
    const guide = build({
      readings: [cervix(0, 9), cervix(1, 10)],
      pushingAt: hour(1.5),
      now: hour(2),
    });
    expect(guide.header.pushingAt).toBe(hour(1.5));
    expect(guide.secondStage).toMatchObject({ startedAt: hour(1), pushingAt: hour(1.5) });
    expect(guide.findings).toEqual([]);
  });

  it('ignores a pushing time that is invalid or in the future', () => {
    for (const pushingAt of ['soon', hour(3)]) {
      const guide = build({ readings: [cervix(0, 9), cervix(1, 10)], pushingAt, now: hour(2) });
      expect(guide.header.pushingAt).toBeNull();
      expect(guide.secondStage?.pushingAt).toBeNull();
    }
  });

  it('stops every clock at birth and schedules nothing more', () => {
    const guide = build({
      readings: [cervix(0, 9), cervix(1, 10)],
      parity: 1,
      birthAt: hour(2),
      now: hour(8),
    });
    expect(guide.status).toBe('birth');
    expect(guide.header.birthAt).toBe(hour(2));
    expect(guide.secondStage).toMatchObject({ hours: 1, prolonged: false });
    expect(guide.findings).toEqual([]);
    expect(guide.due).toEqual([]);
  });

  it('switches to second-stage monitoring once fully dilated', () => {
    const guide = build({
      readings: [
        cervix(0, 9),
        cervix(1, 10),
        { kind: 'fetal-heart-rate', at: hour(1), beatsPerMinute: 140 },
      ],
      now: hour(1.25),
    });
    const byCheck = Object.fromEntries(guide.due.map((check) => [check.check, check]));
    expect(byCheck['fetal-heart-rate']).toMatchObject({ intervalMinutes: 5, minutesOverdue: 10 });
    expect(byCheck['vaginal-exam']).toBeUndefined();
  });
});

describe('alert rows', () => {
  it('flags each Labour Care Guide alert with the reading that triggered it', () => {
    const at = hour(0.5);
    const guide = build({
      readings: [
        cervix(0, 5),
        { kind: 'companion', at, given: 'no', id: 'c' },
        { kind: 'pain-relief', at, given: 'declined' },
        { kind: 'oral-fluid', at, given: 'no' },
        { kind: 'posture', at, position: 'supine' },
        { kind: 'fetal-heart-rate', at, beatsPerMinute: 165 },
        { kind: 'decelerations', at, type: 'late' },
        { kind: 'amniotic-fluid', at, state: 'meconium', meconiumGrade: 2 },
        { kind: 'amniotic-fluid', at, state: 'meconium', meconiumGrade: 3 },
        { kind: 'amniotic-fluid', at, state: 'absent' },
        { kind: 'fetal-position', at, position: 'posterior' },
        { kind: 'caput', at, grade: 3 },
        { kind: 'moulding', at, grade: 3 },
        { kind: 'pulse', at, beatsPerMinute: 125 },
        { kind: 'blood-pressure', at, systolic: 145, diastolic: 85 },
        { kind: 'temperature', at, celsius: 37.6 },
        { kind: 'urine', at, protein: 2, acetone: 2 },
        { kind: 'contractions', at, per10Minutes: 2, durationSeconds: 30 },
        { kind: 'descent', at, fifthsPalpable: 3 },
        { kind: 'drug', at, name: 'paracetamol' },
      ],
      now: hour(1),
    });
    expect(codes(guide).sort()).toEqual(
      [
        'blood-pressure-high',
        'caput-severe',
        'companion-absent',
        'contractions-inadequate',
        'fetal-heart-rate-high',
        'fetal-position-abnormal',
        'ketonuria',
        'late-decelerations',
        'meconium-stained-liquor',
        'moulding-severe',
        'oral-fluid-absent',
        'proteinuria',
        'pulse-high',
        'supine-posture',
        'temperature-high',
      ].sort(),
    );
    expect(guide.findings.find((finding) => finding.code === 'companion-absent')).toEqual({
      code: 'companion-absent',
      severity: 'watch',
      kind: 'companion',
      at,
      hour: 0.5,
      readingId: 'c',
    });
  });

  it('makes excessive contractions urgent while oxytocin runs', () => {
    const guide = build({
      readings: [
        cervix(0, 5),
        { kind: 'oxytocin', at: hour(0.5), unitsPerLitre: 5, dropsPerMinute: 10 },
        { kind: 'contractions', at: hour(1), per10Minutes: 6, durationSeconds: 45 },
      ],
      now: hour(1),
    });
    expect(guide.findings).toMatchObject([{ code: 'contractions-excessive', severity: 'urgent' }]);
  });
});

describe('grid', () => {
  it('lays out hourly first-stage columns and readings by section', () => {
    const guide = build({
      readings: [
        cervix(0, 5),
        { kind: 'fetal-heart-rate', at: hour(0.5), beatsPerMinute: 140 },
        { kind: 'fetal-heart-rate', at: hour(1), beatsPerMinute: 138 },
        { kind: 'companion', at: hour(1), given: 'yes' },
      ],
      now: hour(1),
    });
    const { firstStage, secondStage } = guide.grid;
    expect(secondStage).toBeNull();
    expect(firstStage.columns).toHaveLength(12);
    expect(firstStage.columns[1]).toEqual({ index: 1, hour: 1, from: hour(1), to: hour(2) });
    expect(Object.keys(firstStage.rows)).toEqual([
      'supportiveCare',
      'baby',
      'woman',
      'progress',
      'medication',
    ]);
    expect(firstStage.rows.baby['fetal-heart-rate'].map((r) => [r.hour, r.column])).toEqual([
      [0.5, 0],
      [1, 1],
    ]);
    expect(firstStage.rows.supportiveCare.companion).toHaveLength(1);
    expect(firstStage.rows.progress.cervix).toHaveLength(1);
  });

  it('grows the first stage past 12 hours and gives the second stage hourly columns', () => {
    const guide = build({
      readings: [
        cervix(0, 5),
        cervix(13, 10),
        { kind: 'fetal-heart-rate', at: hour(12.5), beatsPerMinute: 140 },
        { kind: 'fetal-heart-rate', at: hour(13.5), beatsPerMinute: 140 },
      ],
      now: hour(13.5),
    });
    expect(guide.grid.firstStage.columns).toHaveLength(13);
    expect(guide.grid.firstStage.rows.baby['fetal-heart-rate']).toHaveLength(1);
    const second = guide.grid.secondStage;
    expect(second?.columns).toHaveLength(3);
    expect(second?.columns[0]).toEqual({ index: 0, hour: 13, from: hour(13), to: hour(14) });
    expect(second?.rows.baby['fetal-heart-rate'].map((r) => [r.hour, r.column])).toEqual([
      [13.5, 0],
    ]);
  });
});

describe('rules overrides', () => {
  it('uses a local start and per-centimetre limit', () => {
    const guide = build({
      readings: [cervix(0, 4)],
      rules: { cervix: { activePhaseFromCm: 4 }, cervixAlertHours: { 4: 8 } },
      now: hour(8),
    });
    expect(guide.progress).toMatchObject({ dilatationCm: 4, limitHours: 8, delayed: true });
  });
});

const time = fc.integer({ min: 0, max: 40 }).map((step) => hour(step / 4));
const arbitraryReading: fc.Arbitrary<Reading> = fc.oneof(
  fc.record({
    kind: fc.constant('cervix' as const),
    at: time,
    dilatationCm: fc.integer({ min: 3, max: 10 }),
  }),
  fc.record({
    kind: fc.constant('fetal-heart-rate' as const),
    at: time,
    beatsPerMinute: fc.integer({ min: 90, max: 190 }),
  }),
  fc.record({
    kind: fc.constant('companion' as const),
    at: time,
    given: fc.constantFrom('yes' as const, 'no' as const, 'declined' as const),
  }),
  fc.record({
    kind: fc.constant('caput' as const),
    at: time,
    grade: fc.constantFrom(0 as const, 1 as const, 2 as const, 3 as const),
  }),
  fc.record({
    kind: fc.constant('contractions' as const),
    at: time,
    per10Minutes: fc.integer({ min: 0, max: 7 }),
    durationSeconds: fc.integer({ min: 10, max: 80 }),
  }),
);

function withoutIssues(guide: LabourCareGuide): Omit<LabourCareGuide, 'issues'> {
  const { issues: _issues, ...rest } = guide;
  return rest;
}

describe('buildLabourCareGuide properties', () => {
  it('gives the same guide whatever order the readings come in', () => {
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
        fc.constantFrom(0, 2, null),
        ([readings, shuffled], parity) => {
          expect(
            withoutIssues(buildLabourCareGuide({ readings: shuffled, parity, now: hour(12) })),
          ).toEqual(withoutIssues(buildLabourCareGuide({ readings, parity, now: hour(12) })));
        },
      ),
    );
  });

  it('never loses a finding when a normal fetal heart rate is added', () => {
    fc.assert(
      fc.property(fc.array(arbitraryReading, { maxLength: 30 }), time, (readings, at) => {
        const before = buildLabourCareGuide({ readings, parity: 1, now: hour(12) });
        const after = buildLabourCareGuide({
          readings: [...readings, { kind: 'fetal-heart-rate', at, beatsPerMinute: 140 }],
          parity: 1,
          now: hour(12),
        });
        if (before.status === 'not-started') return;
        expect(started(after).findings).toEqual(expect.arrayContaining([...before.findings]));
      }),
    );
  });
});
