import { describe, expect, it } from 'vitest';
import {
  WHO_MODIFIED_PARTOGRAPH_RULES as who,
  resolvePartographRules,
} from '../../src/partograph/rules.js';

describe('resolvePartographRules', () => {
  it('returns the WHO defaults when nothing is overridden', () => {
    expect(resolvePartographRules()).toBe(who);
    expect(resolvePartographRules({})).toBe(who);
  });

  it('replaces only the overridden values', () => {
    const rules = resolvePartographRules({ fetalHeartRate: { lowBelow: 120 } });
    expect(rules.fetalHeartRate).toEqual({ ...who.fetalHeartRate, lowBelow: 120 });
    expect(rules.pulse).toBe(who.pulse);
  });

  it('can switch a check off with null', () => {
    const rules = resolvePartographRules({ firstStageMinutes: { temperature: null } });
    expect(rules.firstStageMinutes.temperature).toBeNull();
  });

  it('freezes the WHO defaults and resolved rules', () => {
    expect(Object.isFrozen(who)).toBe(true);
    expect(Object.isFrozen(who.cervix)).toBe(true);
    expect(Object.isFrozen(resolvePartographRules({ pulse: { highFrom: 110 } }).pulse)).toBe(true);
  });

  it.each([
    ['a negative value', { pulse: { highFrom: -1 } }, 'rules.pulse.highFrom'],
    [
      'a string',
      { temperature: { highFrom: '38' as unknown as number } },
      'rules.temperature.highFrom',
    ],
    ['NaN', { chart: { minimumHours: Number.NaN } }, 'rules.chart.minimumHours'],
    ['an active phase at full dilatation', { cervix: { activePhaseFromCm: 10 } }, 'rules.cervix'],
    ['a zero alert line rate', { cervix: { alertLineCmPerHour: 0 } }, 'rules.cervix'],
    ['zero-minute columns', { chart: { columnMinutes: 0 } }, 'rules.chart.columnMinutes'],
  ])('rejects %s', (_, overrides, message) => {
    expect(() => resolvePartographRules(overrides)).toThrow(TypeError);
    expect(() => resolvePartographRules(overrides)).toThrow(message);
  });
});
