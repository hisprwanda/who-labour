import { describe, expect, it } from 'vitest';
import * as core from '../src/core/index.js';
import * as root from '../src/index.js';
import * as partograph from '../src/partograph/index.js';

const CORE = [
  'MS_PER_HOUR',
  'MS_PER_MINUTE',
  'classifyAmnioticFluid',
  'classifyBloodPressure',
  'classifyContractions',
  'classifyFetalHeartRate',
  'classifyMoulding',
  'classifyPulse',
  'classifyTemperature',
  'classifyUrine',
  'contractionDurationBand',
  'hoursBetween',
  'normalizeReadings',
  'parseInstant',
  'toIsoString',
];

const PARTOGRAPH = [
  'WHO_MODIFIED_PARTOGRAPH_RULES',
  'actionLine',
  'actionLineHourAt',
  'alertLine',
  'alertLineHourAt',
  'buildPartograph',
  'cervixZone',
  'dueChecks',
  'resolvePartographRules',
];

describe('public API', () => {
  it('exposes exactly the documented values from each entry point', () => {
    expect(Object.keys(core).sort()).toEqual(CORE);
    expect(Object.keys(partograph).sort()).toEqual(PARTOGRAPH);
    expect(Object.keys(root).sort()).toEqual([...CORE, ...PARTOGRAPH].sort());
  });
});
