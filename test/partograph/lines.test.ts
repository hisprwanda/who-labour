import { describe, expect, it } from 'vitest';
import {
  actionLine,
  actionLineHourAt,
  alertLine,
  alertLineHourAt,
  cervixZone,
} from '../../src/partograph/lines.js';
import { WHO_MODIFIED_PARTOGRAPH_RULES } from '../../src/partograph/rules.js';

const rules = WHO_MODIFIED_PARTOGRAPH_RULES.cervix;

describe('alert and action lines', () => {
  it('runs the alert line from 4 cm to 10 cm over 6 hours', () => {
    expect(alertLine(4, rules)).toEqual({
      start: { hour: 0, dilatationCm: 4 },
      end: { hour: 6, dilatationCm: 10 },
    });
  });

  it('draws the action line 4 hours to the right', () => {
    expect(actionLine(4, rules)).toEqual({
      start: { hour: 4, dilatationCm: 4 },
      end: { hour: 10, dilatationCm: 10 },
    });
  });

  it('starts both lines at the admission dilatation when admitted at 7 cm', () => {
    expect(alertLine(7, rules).end).toEqual({ hour: 3, dilatationCm: 10 });
    expect(actionLine(7, rules).start).toEqual({ hour: 4, dilatationCm: 7 });
  });

  it('gives the hour each line reaches a dilatation, capped at full dilatation', () => {
    expect(alertLineHourAt(6, 4, rules)).toBe(2);
    expect(actionLineHourAt(6, 4, rules)).toBe(6);
    expect(alertLineHourAt(12, 4, rules)).toBe(6);
  });
});

describe('cervixZone', () => {
  it.each([
    ['on the alert line', 2, 6, 'left-of-alert-line'],
    ['ahead of the alert line', 1, 7, 'left-of-alert-line'],
    ['just right of the alert line', 2.5, 6, 'between-lines'],
    ['just left of the action line', 5.9, 6, 'between-lines'],
    ['on the action line', 6, 6, 'right-of-action-line'],
    ['past the action line', 8, 6, 'right-of-action-line'],
    ['with no progress for 4 hours', 4, 4, 'right-of-action-line'],
    ['fully dilated after the action line reached 10 cm', 11, 10, 'right-of-action-line'],
    ['fully dilated on time', 6, 10, 'left-of-alert-line'],
  ] as const)('places a point %s', (_, hours, dilatationCm, zone) => {
    expect(cervixZone({ hour: hours, dilatationCm }, 4, rules)).toBe(zone);
  });

  it('uses a custom action line distance', () => {
    expect(cervixZone({ hour: 2, dilatationCm: 4 }, 4, { ...rules, actionLineAfterHours: 2 })).toBe(
      'right-of-action-line',
    );
  });
});
