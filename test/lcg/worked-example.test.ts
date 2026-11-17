import { describe, expect, it } from 'vitest';
import type { Reading } from '../../src/core/types.js';
import { buildLabourCareGuide } from '../../src/lcg/build.js';

// Mary Jane, from the WHO labour care guide user's manual (2020), Figures 3 to 8.
const at = (time: string): string => `2020-06-07T${time}:00Z`;

const halfHours = (from: number, count: number): string[] =>
  Array.from({ length: count }, (_, step) => {
    const minutes = from * 60 + step * 30;
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    return at(`${hh}:${minutes % 60 === 0 ? '00' : '30'}`);
  });

const hourly = (from: number, count: number): string[] =>
  halfHours(from, count * 2).filter((_, step) => step % 2 === 0);

const FIRST_STAGE_FHR = [140, 136, 132, 148, 133, 145, 138, 128, 151, 133, 149, 125, 153, 130];
const FIRST_STAGE_DECELERATIONS = 'NNVNNNNNVNNNNN';
const FIRST_STAGE_CONTRACTIONS = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3];
const FIRST_STAGE_DURATIONS = [40, 40, 40, 40, 40, 45, 40, 45, 50, 50, 50, 40, 50, 50];
const COMPANION = 'NYYYNYYY';
const PAIN_RELIEF = 'NYYYNYYY';
const ORAL_FLUID = 'YYYDYYDY';
const POSTURE = ['mobile', 'supine', 'mobile', 'mobile', 'supine', 'mobile', 'mobile', 'supine'];

const answer = (letter: string) => (letter === 'Y' ? 'yes' : letter === 'D' ? 'declined' : 'no');
const deceleration = (letter: string) => (letter === 'V' ? 'variable' : 'none');

const readings: Reading[] = [
  ...halfHours(6, 14).flatMap((time, step): Reading[] => [
    { kind: 'fetal-heart-rate', at: time, beatsPerMinute: FIRST_STAGE_FHR[step] ?? 0 },
    { kind: 'decelerations', at: time, type: deceleration(FIRST_STAGE_DECELERATIONS[step] ?? '') },
    {
      kind: 'contractions',
      at: time,
      per10Minutes: FIRST_STAGE_CONTRACTIONS[step] ?? 0,
      durationSeconds: FIRST_STAGE_DURATIONS[step] ?? 0,
    },
  ]),
  ...hourly(6, 8).flatMap((time, step): Reading[] => [
    { kind: 'companion', at: time, given: answer(COMPANION[step] ?? '') },
    { kind: 'pain-relief', at: time, given: answer(PAIN_RELIEF[step] ?? '') },
    { kind: 'oral-fluid', at: time, given: answer(ORAL_FLUID[step] ?? '') },
    { kind: 'posture', at: time, position: POSTURE[step] === 'supine' ? 'supine' : 'mobile' },
  ]),
  // 06:00 admission.
  { kind: 'cervix', at: at('06:00'), dilatationCm: 5 },
  { kind: 'descent', at: at('06:00'), fifthsPalpable: 4 },
  { kind: 'amniotic-fluid', at: at('06:00'), state: 'clear' },
  { kind: 'fetal-position', at: at('06:00'), position: 'posterior' },
  { kind: 'caput', at: at('06:00'), grade: 0 },
  { kind: 'moulding', at: at('06:00'), grade: 0 },
  { kind: 'pulse', at: at('06:00'), beatsPerMinute: 88 },
  { kind: 'blood-pressure', at: at('06:00'), systolic: 120, diastolic: 80 },
  { kind: 'temperature', at: at('06:00'), celsius: 36.5 },
  { kind: 'urine', at: at('06:00'), protein: 0, acetone: 0 },
  // 10:00 exam.
  { kind: 'cervix', at: at('10:00'), dilatationCm: 8 },
  { kind: 'descent', at: at('10:00'), fifthsPalpable: 3 },
  { kind: 'amniotic-fluid', at: at('10:00'), state: 'meconium', meconiumGrade: 1 },
  { kind: 'fetal-position', at: at('10:00'), position: 'transverse' },
  { kind: 'caput', at: at('10:00'), grade: 1 },
  { kind: 'moulding', at: at('10:00'), grade: 1 },
  { kind: 'pulse', at: at('10:00'), beatsPerMinute: 96 },
  { kind: 'blood-pressure', at: at('10:00'), systolic: 128, diastolic: 84 },
  { kind: 'temperature', at: at('10:00'), celsius: 36.9 },
  { kind: 'urine', at: at('10:00'), protein: 0, acetone: 0 },
  // 13:00 full dilatation, then the second stage.
  { kind: 'cervix', at: at('13:00'), dilatationCm: 10 },
  { kind: 'descent', at: at('13:00'), fifthsPalpable: 2 },
  { kind: 'amniotic-fluid', at: at('13:00'), state: 'meconium', meconiumGrade: 1 },
  { kind: 'fetal-position', at: at('13:00'), position: 'anterior' },
  { kind: 'caput', at: at('13:00'), grade: 1 },
  { kind: 'moulding', at: at('13:00'), grade: 2 },
  { kind: 'fetal-heart-rate', at: at('13:00'), beatsPerMinute: 132 },
  { kind: 'decelerations', at: at('13:00'), type: 'none' },
  { kind: 'contractions', at: at('13:00'), per10Minutes: 3, durationSeconds: 50 },
  { kind: 'companion', at: at('13:05'), given: 'yes' },
  { kind: 'pain-relief', at: at('13:05'), given: 'yes' },
  { kind: 'oral-fluid', at: at('13:05'), given: 'yes' },
  { kind: 'posture', at: at('13:05'), position: 'supine' },
  { kind: 'descent', at: at('13:30'), fifthsPalpable: 0 },
  { kind: 'fetal-heart-rate', at: at('13:30'), beatsPerMinute: 118 },
  { kind: 'decelerations', at: at('13:30'), type: 'early' },
  { kind: 'contractions', at: at('13:30'), per10Minutes: 4, durationSeconds: 50 },
];

describe('WHO user manual worked example (Mary Jane)', () => {
  const guide = buildLabourCareGuide({
    readings,
    parity: 2,
    birthAt: at('13:45'),
    now: at('14:00'),
  });
  if (guide.status === 'not-started') throw new Error('expected a started guide');

  it('charts every reading from active labour at 5 cm to birth', () => {
    expect(guide.status).toBe('birth');
    expect(guide.issues).toEqual([]);
    expect(guide.header).toMatchObject({ parity: 2, activeLabourAt: '2020-06-07T06:00:00.000Z' });
  });

  it('shows the normal progress the manual describes', () => {
    expect(
      guide.cervix.map(({ dilatationCm, hours, delayed }) => [dilatationCm, hours, delayed]),
    ).toEqual([
      [5, 4, false],
      [8, 3, false],
    ]);
    expect(guide.secondStage).toMatchObject({ hours: 0.75, limitHours: 2, prolonged: false });
  });

  it('flags only the observations the manual circles', () => {
    const flagged = guide.findings.map((finding) => `${finding.code} ${finding.at.slice(11, 16)}`);
    expect(flagged.sort()).toEqual(
      [
        'companion-absent 06:00',
        'companion-absent 10:00',
        'fetal-position-abnormal 06:00',
        'fetal-position-abnormal 10:00',
        'pain-relief-absent 06:00',
        'pain-relief-absent 10:00',
        'supine-posture 07:00',
        'supine-posture 10:00',
        'supine-posture 13:00',
        'supine-posture 13:05',
      ].sort(),
    );
  });
});
