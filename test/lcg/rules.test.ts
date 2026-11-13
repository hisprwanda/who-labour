import { describe, expect, it } from 'vitest';
import {
  WHO_LABOUR_CARE_GUIDE_RULES as who,
  resolveLabourCareGuideRules,
} from '../../src/lcg/rules.js';

describe('resolveLabourCareGuideRules', () => {
  it('returns the frozen WHO defaults without overrides', () => {
    expect(resolveLabourCareGuideRules()).toBe(who);
    expect(Object.isFrozen(who)).toBe(true);
    expect(Object.isFrozen(who.cervixAlertHours)).toBe(true);
  });

  it('merges overrides group by group', () => {
    const rules = resolveLabourCareGuideRules({
      cervixAlertHours: { 5: 4 },
      secondStageMinutes: { contractions: null },
    });
    expect(rules.cervixAlertHours).toEqual({ 5: 4, 6: 5, 7: 3, 8: 2.5, 9: 2 });
    expect(rules.secondStageMinutes.contractions).toBeNull();
    expect(rules.fetalHeartRate).toBe(who.fetalHeartRate);
    expect(Object.isFrozen(rules)).toBe(true);
  });

  it.each([
    ['a negative value', { pulse: { lowBelow: -1 } }],
    ['a start at full dilatation', { cervix: { activePhaseFromCm: 10 } }],
    ['a start without a centimetre limit', { cervix: { activePhaseFromCm: 4 } }],
    ['a zero centimetre limit', { cervixAlertHours: { 7: 0 } }],
    ['zero-minute columns', { chart: { secondStageColumnMinutes: 0 } }],
  ])('throws a TypeError for %s', (_name, overrides) => {
    expect(() => resolveLabourCareGuideRules(overrides)).toThrow(TypeError);
  });
});
