# @hisprwanda/who-labour

WHO labour monitoring for JavaScript and TypeScript. Version 0.x covers the **WHO modified
partograph**: the cervicograph with its alert and action lines, findings for abnormal readings, and
which routine checks are due. Support for the **WHO Labour Care Guide** (LCG) is planned as a second
entry point in the same package.

- Pure functions, no I/O and no runtime dependencies
- ESM and CommonJS, with types
- Works in Node.js 22+, browsers and React Native
- Results are plain JSON: ISO times, numbers and string codes your app translates

> This library supports clinical decisions. It is not a medical device and does not replace
> clinical judgement or local protocols.

## Install

```sh
npm install @hisprwanda/who-labour
```

## Quick start

```ts
import { buildPartograph } from '@hisprwanda/who-labour/partograph';

const partograph = buildPartograph({
  now: '2026-01-10T13:00:00+02:00',
  readings: [
    { kind: 'cervix', at: '2026-01-10T08:00:00+02:00', dilatationCm: 4 },
    { kind: 'fetal-heart-rate', at: '2026-01-10T08:00:00+02:00', beatsPerMinute: 142 },
    { kind: 'contractions', at: '2026-01-10T08:00:00+02:00', per10Minutes: 3, durationSeconds: 45 },
    { kind: 'cervix', at: '2026-01-10T12:00:00+02:00', dilatationCm: 5, id: 'exam-2' },
  ],
});

if (partograph.status !== 'not-started') {
  partograph.findings;
  // [{ code: 'alert-line-crossed', severity: 'watch', kind: 'cervix', at: '...', hour: 4, readingId: 'exam-2' }]
  partograph.progress?.actionLineReachedAt; // when 5 cm meets the action line: 2026-01-10T11:00:00.000Z
  partograph.due; // every check overdue except the vaginal exam, next due 2026-01-10T14:00:00.000Z
}
```

## How it works

1. **Readings in.** Each observation is one reading with a `kind`, a time `at` and its values. An
   optional `id` (for example your observation id) is carried into findings and issues.
2. **Validation.** Readings with an unknown kind, a time without a zone, impossible values, a time
   after `now`, or an exact duplicate are left out and listed in `issues` with their input index.
   Bad clinical data never throws; only programmer errors (an invalid `now` or invalid rules) throw
   a `TypeError`.
3. **Start of the chart.** The partograph starts at the first cervix reading of 4 cm or more.
   Readings taken before that are listed as `before-start`. Until then the result is
   `{ status: 'not-started' }`.
4. **Lines and zones.** The lines are fixed, as on the printed chart: the alert line rises 1 cm per
   hour from 4 cm at hour 0 to 10 cm, and the action line runs 4 hours to its right. The first
   active-phase exam is plotted on the alert line, so a woman admitted at 7 cm starts at hour 3 and
   the columns before it stay empty. Every reading's `hour` and `column` count from the alert
   line's start, not from admission. Every cervix point gets a zone: `left-of-alert-line` (on the line counts as
   left), `between-lines` or `right-of-action-line` (on the line counts as right).
5. **Findings.** Each reading is checked against the rules below. Severity is `watch` (reassess,
   consider referral) or `urgent` (act now).
6. **Due checks.** For each routine check: when it was last done, when it is next due and how many
   minutes late it is. Once fully dilated, second-stage intervals apply.
7. **Grid.** Half-hour columns from the alert line's start, at least 12 hours long, with
   every reading placed in its row and column.

## Readings

| `kind`             | Values                                                                      |
| ------------------ | --------------------------------------------------------------------------- |
| `fetal-heart-rate` | `beatsPerMinute`                                                            |
| `amniotic-fluid`   | `state`: `intact`, `ruptured`, `clear`, `meconium`, `blood`, `absent`       |
| `moulding`         | `grade`: 0 separated, 1 apposed, 2 overlapped reducible, 3 overlapped fixed |
| `cervix`           | `dilatationCm` from 0 to 10                                                 |
| `descent`          | `fifthsPalpable` from 5 to 0                                                |
| `contractions`     | `per10Minutes`, `durationSeconds`                                           |
| `oxytocin`         | `unitsPerLitre`, `dropsPerMinute` (0 means stopped)                         |
| `drug`             | `name`, optional `dose`                                                     |
| `iv-fluid`         | `name`, optional `volumeMl`                                                 |
| `pulse`            | `beatsPerMinute`                                                            |
| `blood-pressure`   | `systolic`, `diastolic` in mmHg                                             |
| `temperature`      | `celsius`                                                                   |
| `urine`            | at least one of `protein` and `acetone` (dipstick 0 to 4), `volumeMl`       |

Times are a `Date`, epoch milliseconds or an ISO 8601 string with `Z` or an offset. A string without
a zone is rejected, because its meaning depends on the device it runs on.

## Rules and sources

All defaults live in `WHO_MODIFIED_PARTOGRAPH_RULES`. The partograph manuals define the chart and
the monitoring intervals but give few numeric thresholds, so findings use the alert values of the
WHO Labour Care Guide and the emergency values of MCPC.

| Rule                     | Default                                                         | Source              |
| ------------------------ | --------------------------------------------------------------- | ------------------- |
| Active phase starts      | 4 cm                                                            | MCPC 2017           |
| Alert line               | 1 cm per hour from the first active exam                        | MCPC 2017           |
| Action line              | 4 hours right of the alert line                                 | MCPC 2017           |
| Fetal heart rate, pulse  | every 30 min (fetal every 5 min in stage 2)                     | WHO 1994, MCPC 2017 |
| Contractions             | every 30 min                                                    | WHO 1994            |
| Temperature              | every 2 h                                                       | WHO 1994            |
| Blood pressure           | every 4 h                                                       | WHO 1994            |
| Vaginal exam             | every 4 h in the first stage                                    | WHO 1994            |
| Fetal heart rate, watch  | below 110 or 160 and above                                      | LCG 2020            |
| Fetal heart rate, urgent | below 100 or above 180                                          | MCPC 2017           |
| Liquor                   | meconium, blood-stained or absent                               | WHO 1994            |
| Moulding                 | grade 3 (+++)                                                   | WHO 1994, LCG 2020  |
| Contractions, inadequate | fewer than 3 in 10 min, or 40 s or less                         | MCPC 2017           |
| Contractions, excessive  | more than 5 in 10 min, or over 60 s; urgent while oxytocin runs | LCG 2020, MCPC 2017 |
| Pulse                    | below 60 or 120 and above                                       | LCG 2020            |
| Blood pressure, watch    | systolic below 80 or 140 and above, diastolic 90 and above      | LCG 2020            |
| Blood pressure, urgent   | systolic 160 and above or diastolic 110 and above               | MCPC 2017           |
| Temperature              | below 35.0 or 37.5 and above °C                                 | LCG 2020            |
| Urine                    | protein or acetone ++ and above                                 | LCG 2020            |

- **WHO 1994:** World Health Organization. _The partograph: the application of the WHO partograph in
  the management of labour._ WHO/FHE/MSM/93.8. Geneva: WHO; 1994.
- **MCPC 2017:** World Health Organization. _Managing complications in pregnancy and childbirth: a
  guide for midwives and doctors._ 2nd ed. Geneva: WHO; 2017.
- **LCG 2020:** World Health Organization. _WHO labour care guide: user's manual._ Geneva: WHO; 2020.

The values above were transcribed by hand and must be checked against the documents by a
clinician before the first release. Please report any difference with the "Clinical accuracy" issue
template.

### Local protocols

Every value can be overridden, group by group, when a country or facility uses a different protocol:

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

Use `null` to stop scheduling a check. Invalid values throw a `TypeError`.

## API

| Entry point                         | Exports                                                                                                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@hisprwanda/who-labour/partograph` | `buildPartograph`, `WHO_MODIFIED_PARTOGRAPH_RULES`, `resolvePartographRules`, `alertLine`, `actionLine`, `alertLineHourAt`, `actionLineHourAt`, `cervixZone`, `dueChecks`                                                                                                      |
| `@hisprwanda/who-labour/core`       | `normalizeReadings`, `parseInstant`, `hoursBetween`, `toIsoString`, `classifyFetalHeartRate`, `classifyAmnioticFluid`, `classifyMoulding`, `classifyContractions`, `contractionDurationBand`, `classifyPulse`, `classifyBloodPressure`, `classifyTemperature`, `classifyUrine` |
| `@hisprwanda/who-labour`            | everything above                                                                                                                                                                                                                                                               |

Every export has a one-line description in its type definitions.

## Finding codes

`fetal-heart-rate-low`, `fetal-heart-rate-high`, `meconium-stained-liquor`, `blood-stained-liquor`,
`liquor-absent`, `moulding-severe`, `contractions-inadequate`, `contractions-excessive`,
`pulse-low`, `pulse-high`, `blood-pressure-low`, `blood-pressure-high`, `blood-pressure-severe`,
`temperature-low`, `temperature-high`, `proteinuria`, `ketonuria`, `alert-line-crossed`,
`action-line-crossed`.

## Roadmap

- `@hisprwanda/who-labour/lcg`: the WHO Labour Care Guide (active phase from 5 cm, time limits per
  centimetre, second-stage limits by parity, supportive care), built on the same readings.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security and clinical safety issues: see
[SECURITY.md](SECURITY.md).

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
