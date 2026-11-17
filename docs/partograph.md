# Partograph

`@hisprwanda/who-labour/partograph` builds the WHO modified partograph from labour readings: the
cervicograph with its alert and action lines, findings for abnormal readings, and the routine checks
that are due.

```ts
import { buildPartograph } from '@hisprwanda/who-labour/partograph';

const partograph = buildPartograph({
  now: '2026-01-10T13:00:00+02:00',
  readings: [
    { kind: 'cervix', at: '2026-01-10T08:00:00+02:00', dilatationCm: 4 },
    { kind: 'fetal-heart-rate', at: '2026-01-10T08:00:00+02:00', beatsPerMinute: 142 },
    { kind: 'cervix', at: '2026-01-10T12:00:00+02:00', dilatationCm: 5, id: 'exam-2' },
  ],
});

if (partograph.status !== 'not-started') {
  partograph.findings;
  // [{ code: 'alert-line-crossed', severity: 'watch', kind: 'cervix', hour: 4, readingId: 'exam-2', ... }]
  partograph.progress?.zone; // 'between-lines': 5 cm at hour 4
  partograph.progress?.zoneNow; // 'right-of-action-line': still 5 cm an hour later
}
```

## Input

| Field      | Description                                                              |
| ---------- | ------------------------------------------------------------------------ |
| `readings` | every observation for this labour, in any order (see [Core](core.md))    |
| `now`      | the current time; defaults to `Date.now()`. Readings after it are issues |
| `rules`    | optional overrides of the WHO defaults (see [Local rules](#local-rules)) |

Only an invalid `now` or invalid `rules` throw. Bad readings end up in `issues`.

## Result

Until a cervix reading reaches the active phase, the result is `{ status: 'not-started', issues }`.
After that:

| Field                     | Description                                                                 |
| ------------------------- | --------------------------------------------------------------------------- |
| `status`                  | `active-phase` or `fully-dilated`                                           |
| `startedAt`               | time of the first exam at 4 cm or more                                      |
| `fullyDilatedAt`          | time of the first 10 cm exam, or `null`                                     |
| `alertLine`, `actionLine` | the two lines as `{ start, end }` points of `{ hour, dilatationCm }`        |
| `cervix`                  | every cervix exam with its `hour`, `column` and `zone`                      |
| `progress`                | the latest exam: its zone, its zone at `now`, and when each line reaches it |
| `findings`                | abnormal readings and line crossings, in chart order                        |
| `due`                     | each routine check: `lastAt`, `nextDueAt`, `minutesOverdue`                 |
| `grid`                    | half-hour `columns` and readings grouped in `rows` by kind                  |
| `issues`                  | readings left out, and why                                                  |

`progress` is `null` once she is fully dilated.

## How it works

**Start.** The chart starts at the first cervix exam of 4 cm or more. Earlier readings are reported
as `before-start`.

**Lines.** The lines are fixed, as on the printed chart. The alert line rises 1 cm per hour from 4 cm
at hour 0 to 10 cm; the action line runs 4 hours to its right. The first exam is plotted on the
alert line, so a woman admitted at 7 cm starts at hour 3 and the earlier columns stay empty. Every
`hour` and `column` counts from where the alert line starts, not from admission.

**Zones.** Each exam is `left-of-alert-line`, `between-lines` or `right-of-action-line`. A point on
the alert line counts as left, and a point on the action line counts as right. Zones compare times,
so a late full dilatation still counts as past the action line.

**Findings.** Each reading is checked against the rules below. The first exam past each line also
raises `alert-line-crossed` or `action-line-crossed`.

**Due checks.** A check that was never done is due one interval after the start. Once she is fully
dilated, second-stage intervals apply: fetal heart rate every 5 minutes and no scheduled vaginal
exam.

**Grid.** Half-hour columns from the alert line's start, at least 12 hours long.

## Rules

Defaults live in `WHO_MODIFIED_PARTOGRAPH_RULES`. The partograph manuals define the chart and how
often to check, but give few numbers for what is abnormal, so findings use the Labour Care Guide's
alert values and the emergency values of MCPC. Sources are listed in the
[README](../README.md#sources).

| Rule                     | Default                                                         | Source              |
| ------------------------ | --------------------------------------------------------------- | ------------------- |
| Active phase starts      | 4 cm                                                            | MCPC 2017           |
| Alert line               | 1 cm per hour from the first active exam                        | MCPC 2017           |
| Action line              | 4 hours right of the alert line                                 | MCPC 2017           |
| Fetal heart rate, pulse  | every 30 min (fetal heart rate every 5 min in stage 2)          | WHO 1994, MCPC 2017 |
| Contractions             | every 30 min                                                    | WHO 1994            |
| Temperature              | every 2 h                                                       | WHO 1994            |
| Blood pressure           | every 4 h                                                       | WHO 1994            |
| Vaginal exam             | every 4 h in the first stage                                    | WHO 1994            |
| Fetal heart rate, watch  | below 110, or 160 and above                                     | LCG 2021            |
| Fetal heart rate, urgent | below 100 or above 180                                          | MCPC 2017           |
| Liquor                   | meconium, blood-stained or absent                               | WHO 1994            |
| Moulding                 | +++                                                             | WHO 1994, LCG 2021  |
| Contractions, inadequate | fewer than 3 in 10 min, or 40 s or less                         | MCPC 2017           |
| Contractions, excessive  | more than 5 in 10 min, or over 60 s; urgent while oxytocin runs | LCG 2021, MCPC 2017 |
| Pulse                    | below 60, or 120 and above                                      | LCG 2021            |
| Blood pressure, watch    | systolic below 80 or 140 and above, diastolic 90 and above      | LCG 2021            |
| Blood pressure, urgent   | systolic 160 and above, or diastolic 110 and above              | MCPC 2017           |
| Temperature              | below 35.0, or 37.5 °C and above                                | LCG 2021            |
| Urine                    | protein or acetone ++ and above                                 | LCG 2021            |

These values were transcribed by hand. If one differs from the source, please open a "Clinical
accuracy" issue.

## Local rules

Override any value, group by group, when a country or facility follows a different protocol:

```ts
buildPartograph({
  readings,
  rules: {
    fetalHeartRate: { lowBelow: 120 },
    firstStageMinutes: { temperature: 240 },
    secondStageMinutes: { 'vaginal-exam': 60 },
  },
});
```

Use `null` to stop scheduling a check. An invalid value throws a `TypeError`.
`resolvePartographRules(overrides)` returns the merged rules if you need them yourself.

## Exports

| Export                                                      | Description                                          |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| `buildPartograph(input)`                                    | builds the partograph                                |
| `WHO_MODIFIED_PARTOGRAPH_RULES`                             | the frozen WHO defaults                              |
| `resolvePartographRules(overrides)`                         | defaults merged with overrides                       |
| `alertLine(rules)`, `actionLine(rules)`                     | the two lines, for drawing a chart                   |
| `alertLineHourAt(cm, rules)`, `actionLineHourAt(cm, rules)` | the hour each line reaches a dilatation              |
| `cervixZone(point, rules)`                                  | the zone of a `{ hour, dilatationCm }` point         |
| `dueChecks(input)`                                          | the due checks on their own, from validated readings |

Types: `PartographInput`, `Partograph`, `StartedPartograph`, `NotStartedPartograph`,
`PartographStatus`, `CervixPoint`, `CervixProgress`, `CervixZone`, `ChartPoint`, `DilatationLine`,
`PartographGrid`, `GridColumn`, `ChartedReading`, `ChartedFinding`, `DueCheck`, `DueChecksInput`,
`PartographRules`, `PartographRuleOverrides`, `CervixRules`, `ChartRules`, `MonitoringCheck`,
`MonitoringIntervals`.
