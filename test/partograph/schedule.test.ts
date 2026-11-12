import { describe, expect, it } from 'vitest';
import { normalizeReadings } from '../../src/core/readings.js';
import { WHO_MODIFIED_PARTOGRAPH_RULES as who } from '../../src/partograph/rules.js';
import { dueChecks } from '../../src/partograph/schedule.js';
import { START, hour } from '../helpers.js';

const { readings } = normalizeReadings([
  { kind: 'cervix', at: hour(0), dilatationCm: 4 },
  { kind: 'fetal-heart-rate', at: hour(0), beatsPerMinute: 140 },
  { kind: 'fetal-heart-rate', at: hour(0.5), beatsPerMinute: 138 },
  { kind: 'temperature', at: hour(1), celsius: 36.9 },
]);

describe('dueChecks', () => {
  const due = dueChecks({
    readings,
    startedAt: START,
    now: START + 2 * 3_600_000,
    intervals: who.firstStageMinutes,
  });
  const byCheck = Object.fromEntries(due.map((check) => [check.check, check]));

  it('counts from the last reading of the check', () => {
    expect(byCheck['fetal-heart-rate']).toEqual({
      check: 'fetal-heart-rate',
      intervalMinutes: 30,
      lastAt: hour(0.5),
      nextDueAt: hour(1),
      minutesOverdue: 60,
    });
  });

  it('makes a check never done due one interval after the start', () => {
    expect(byCheck['pulse']).toMatchObject({
      lastAt: null,
      nextDueAt: hour(0.5),
      minutesOverdue: 90,
    });
  });

  it('counts a cervix reading as the vaginal exam', () => {
    expect(byCheck['vaginal-exam']).toMatchObject({
      lastAt: hour(0),
      nextDueAt: hour(4),
      minutesOverdue: 0,
    });
  });

  it('is not overdue before the due time', () => {
    expect(byCheck['temperature']).toMatchObject({ nextDueAt: hour(3), minutesOverdue: 0 });
  });

  it('leaves out checks with no interval', () => {
    const checks = dueChecks({
      readings,
      startedAt: START,
      now: START,
      intervals: who.secondStageMinutes,
    }).map((check) => check.check);
    expect(checks).not.toContain('vaginal-exam');
    expect(checks).toHaveLength(5);
  });
});
