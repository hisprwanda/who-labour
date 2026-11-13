import { describe, expect, it } from 'vitest';
import {
  classifyAmnioticFluid,
  classifyCaput,
  classifyContractionAlerts,
  classifyDecelerations,
  classifyFetalPosition,
  classifyPosture,
  classifySupportiveCare,
} from '../../src/core/index.js';
import { WHO_LABOUR_CARE_GUIDE_RULES as lcg } from '../../src/lcg/rules.js';

describe('classifySupportiveCare', () => {
  it.each([
    ['companion', 'companion-absent'],
    ['pain-relief', 'pain-relief-absent'],
    ['oral-fluid', 'oral-fluid-absent'],
  ] as const)('flags %s not given, but not yes, declined or unknown', (kind, code) => {
    expect(classifySupportiveCare(kind, 'no')).toEqual({ code, severity: 'watch' });
    expect(classifySupportiveCare(kind, 'yes')).toBeNull();
    expect(classifySupportiveCare(kind, 'declined')).toBeNull();
    expect(classifySupportiveCare(kind, 'unknown')).toBeNull();
  });

  it('flags a supine posture only', () => {
    expect(classifyPosture('supine')).toEqual({ code: 'supine-posture', severity: 'watch' });
    expect(classifyPosture('mobile')).toBeNull();
  });
});

describe('Labour Care Guide fetal classifiers', () => {
  it.each([
    ['none', null],
    ['early', null],
    ['variable', null],
    ['late', { code: 'late-decelerations', severity: 'watch' }],
  ] as const)('decelerations %s', (type, expected) => {
    expect(classifyDecelerations(type)).toEqual(expected);
  });

  it.each([
    ['anterior', null],
    ['posterior', { code: 'fetal-position-abnormal', severity: 'watch' }],
    ['transverse', { code: 'fetal-position-abnormal', severity: 'watch' }],
  ] as const)('fetal position %s', (position, expected) => {
    expect(classifyFetalPosition(position)).toEqual(expected);
  });

  it('flags only caput +++', () => {
    expect(classifyCaput(2, lcg.caput)).toBeNull();
    expect(classifyCaput(3, lcg.caput)).toEqual({ code: 'caput-severe', severity: 'watch' });
  });

  it.each([
    [1, null],
    [2, null],
    [3, { code: 'meconium-stained-liquor', severity: 'watch' }],
    [undefined, { code: 'meconium-stained-liquor', severity: 'watch' }],
  ] as const)('meconium grade %s with Labour Care Guide limits', (grade, expected) => {
    expect(classifyAmnioticFluid('meconium', lcg.amnioticFluid, grade)).toEqual(expected);
  });

  it('flags any meconium grade without limits, as the partograph does', () => {
    expect(classifyAmnioticFluid('meconium', undefined, 1)).toEqual({
      code: 'meconium-stained-liquor',
      severity: 'watch',
    });
  });

  it('flags blood-stained liquor with Labour Care Guide limits', () => {
    expect(classifyAmnioticFluid('blood', lcg.amnioticFluid)).toEqual({
      code: 'blood-stained-liquor',
      severity: 'watch',
    });
  });
});

describe('classifyContractionAlerts', () => {
  it.each([
    [2, 40, false, { code: 'contractions-inadequate', severity: 'watch' }],
    [3, 40, false, null],
    [5, 60, false, null],
    [6, 40, false, { code: 'contractions-excessive', severity: 'watch' }],
    [6, 40, true, { code: 'contractions-excessive', severity: 'urgent' }],
    [3, 19, false, { code: 'contractions-inadequate', severity: 'watch' }],
    [3, 20, false, null],
    [3, 61, false, { code: 'contractions-excessive', severity: 'watch' }],
  ])(
    '%i in 10 min lasting %i s, oxytocin %s',
    (per10Minutes, durationSeconds, oxytocin, expected) => {
      expect(
        classifyContractionAlerts({ per10Minutes, durationSeconds }, lcg.contractions, oxytocin),
      ).toEqual(expected);
    },
  );

  it('assumes no oxytocin by default', () => {
    expect(
      classifyContractionAlerts({ per10Minutes: 6, durationSeconds: 40 }, lcg.contractions),
    ).toEqual({ code: 'contractions-excessive', severity: 'watch' });
  });
});
