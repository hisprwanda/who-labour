import { describe, expect, it } from 'vitest';
import {
  classifyAmnioticFluid,
  classifyBloodPressure,
  classifyContractions,
  classifyFetalHeartRate,
  classifyMoulding,
  classifyPulse,
  classifyTemperature,
  classifyUrine,
  contractionDurationBand,
} from '../../src/core/index.js';
import { WHO_MODIFIED_PARTOGRAPH_RULES as who } from '../../src/partograph/rules.js';

describe('classifyFetalHeartRate', () => {
  it.each([
    [99, { code: 'fetal-heart-rate-low', severity: 'urgent' }],
    [100, { code: 'fetal-heart-rate-low', severity: 'watch' }],
    [109, { code: 'fetal-heart-rate-low', severity: 'watch' }],
    [110, null],
    [159, null],
    [160, { code: 'fetal-heart-rate-high', severity: 'watch' }],
    [180, { code: 'fetal-heart-rate-high', severity: 'watch' }],
    [181, { code: 'fetal-heart-rate-high', severity: 'urgent' }],
  ])('%i bpm', (bpm, expected) => {
    expect(classifyFetalHeartRate(bpm, who.fetalHeartRate)).toEqual(expected);
  });
});

describe('classifyAmnioticFluid', () => {
  it.each([
    ['intact', null],
    ['ruptured', null],
    ['clear', null],
    ['meconium', { code: 'meconium-stained-liquor', severity: 'watch' }],
    ['blood', { code: 'blood-stained-liquor', severity: 'watch' }],
    ['absent', { code: 'liquor-absent', severity: 'watch' }],
  ] as const)('%s', (state, expected) => {
    expect(classifyAmnioticFluid(state)).toEqual(expected);
  });
});

describe('classifyMoulding', () => {
  it('flags only grade 3 by default', () => {
    expect(classifyMoulding(2, who.moulding)).toBeNull();
    expect(classifyMoulding(3, who.moulding)).toEqual({
      code: 'moulding-severe',
      severity: 'watch',
    });
  });
});

describe('classifyContractions', () => {
  it.each([
    [3, 41, false, null],
    [3, 40, false, { code: 'contractions-inadequate', severity: 'watch' }],
    [2, 45, false, { code: 'contractions-inadequate', severity: 'watch' }],
    [5, 60, false, null],
    [6, 45, false, { code: 'contractions-excessive', severity: 'watch' }],
    [4, 61, false, { code: 'contractions-excessive', severity: 'watch' }],
    [6, 45, true, { code: 'contractions-excessive', severity: 'urgent' }],
  ])(
    '%i in 10 min lasting %i s, oxytocin %s',
    (per10Minutes, durationSeconds, oxytocin, expected) => {
      expect(
        classifyContractions({ per10Minutes, durationSeconds }, who.contractions, oxytocin),
      ).toEqual(expected);
    },
  );

  it('assumes no oxytocin by default', () => {
    expect(
      classifyContractions({ per10Minutes: 6, durationSeconds: 45 }, who.contractions),
    ).toEqual({
      code: 'contractions-excessive',
      severity: 'watch',
    });
  });

  it.each([
    [19, 'under-20-seconds'],
    [20, '20-to-40-seconds'],
    [40, '20-to-40-seconds'],
    [41, 'over-40-seconds'],
  ] as const)('shades %i s as %s', (seconds, band) => {
    expect(contractionDurationBand(seconds)).toBe(band);
  });
});

describe('maternal classifiers', () => {
  it.each([
    [59, { code: 'pulse-low', severity: 'watch' }],
    [60, null],
    [119, null],
    [120, { code: 'pulse-high', severity: 'watch' }],
  ])('pulse %i', (bpm, expected) => {
    expect(classifyPulse(bpm, who.pulse)).toEqual(expected);
  });

  it.each([
    [79, 50, { code: 'blood-pressure-low', severity: 'watch' }],
    [120, 80, null],
    [139, 89, null],
    [140, 80, { code: 'blood-pressure-high', severity: 'watch' }],
    [130, 90, { code: 'blood-pressure-high', severity: 'watch' }],
    [160, 100, { code: 'blood-pressure-severe', severity: 'urgent' }],
    [150, 110, { code: 'blood-pressure-severe', severity: 'urgent' }],
  ])('blood pressure %i/%i', (systolic, diastolic, expected) => {
    expect(classifyBloodPressure(systolic, diastolic, who.bloodPressure)).toEqual(expected);
  });

  it.each([
    [34.9, { code: 'temperature-low', severity: 'watch' }],
    [35, null],
    [37.4, null],
    [37.5, { code: 'temperature-high', severity: 'watch' }],
  ])('temperature %f', (celsius, expected) => {
    expect(classifyTemperature(celsius, who.temperature)).toEqual(expected);
  });

  it('flags protein and acetone from ++', () => {
    expect(classifyUrine({ protein: 1, acetone: 1 }, who.urine)).toEqual([]);
    expect(classifyUrine({}, who.urine)).toEqual([]);
    expect(classifyUrine({ protein: 2, acetone: 3 }, who.urine)).toEqual([
      { code: 'proteinuria', severity: 'watch' },
      { code: 'ketonuria', severity: 'watch' },
    ]);
  });
});
