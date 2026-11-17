# Labour Care Guide

`@hisprwanda/who-labour/lcg` builds the WHO Labour Care Guide (LCG) from labour readings. It follows
the guide from active labour at 5 cm to birth: time limits for each centimetre of dilatation, a
second-stage limit by parity, supportive care, and an alert for every observation that meets the
guide's "Alert" column.

```ts
import { buildLabourCareGuide } from '@hisprwanda/who-labour/lcg';

const guide = buildLabourCareGuide({
  parity: 0,
  now: '2026-01-10T15:00:00Z',
  readings: [
    { kind: 'cervix', at: '2026-01-10T08:00:00Z', dilatationCm: 5 },
    { kind: 'cervix', at: '2026-01-10T12:00:00Z', dilatationCm: 7 },
    { kind: 'companion', at: '2026-01-10T12:00:00Z', given: 'no' },
  ],
});

if (guide.status !== 'not-started') {
  guide.progress; // { dilatationCm: 7, hours: 3, limitHours: 3, limitReached: true, delayed: false, ... }
  guide.findings.map((finding) => finding.code); // ['companion-absent']
}
```

She has been at 7 cm for 3 hours, the limit for 7 cm. That is not yet an alert: `limitReached`
tells you an exam is worth doing. If that exam still finds 7 cm, the guide raises
`cervix-progress-delayed`.

## Input

| Field                 | Description                                                           |
| --------------------- | --------------------------------------------------------------------- |
| `readings`            | every observation for this labour, in any order (see [Core](core.md)) |
| `parity`              | births after viability; `0` is nulliparous                            |
| `labourOnset`         | `spontaneous` or `induced`                                            |
| `membranesRuptured`   | `true`, `false`, or leave it out when not known                       |
| `membranesRupturedAt` | when they ruptured; implies `membranesRuptured: true`                 |
| `riskFactors`         | a list of short texts, for example `['anaemia']`                      |
| `pushingAt`           | when she started pushing (the form's `P`); raises no alert            |
| `birthAt`             | time of birth; stops every clock and the due checks                   |
| `now`                 | the current time; defaults to `Date.now()`                            |
| `rules`               | optional overrides of the WHO defaults                                |

Everything except `readings` is optional. An invalid or future episode fact becomes `null` in the
result instead of throwing. Use `membranesRuptured: true` with no time for a rupture whose time is
unknown (the form's `U`).

## Result

Until a cervix reading reaches 5 cm, the result is `{ status: 'not-started', issues }`. After that:

| Field         | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| `status`      | `active-first-stage`, `second-stage` or `birth`                           |
| `header`      | the episode facts, plus `activeLabourAt` (the first exam at 5 cm or more) |
| `cervix`      | time spent at each centimetre examined (see below)                        |
| `progress`    | the current centimetre, or `null` once fully dilated                      |
| `secondStage` | time since full dilatation against the parity limit, or `null`            |
| `grid`        | `firstStage` and `secondStage`, each with `columns` and `rows` by section |
| `findings`    | every alert, in chart order                                               |
| `due`         | each routine check: `lastAt`, `nextDueAt`, `minutesOverdue`               |
| `issues`      | readings left out, and why                                                |

Each centimetre in `cervix` (and `progress`) looks like this:

```ts
{
  dilatationCm: 8,
  reachedAt: '2026-01-10T12:00:00.000Z',
  leftAt: null,          // when a later exam found more
  hours: 2.5,            // time at this centimetre so far
  limitHours: 2.5,
  alertAt: '2026-01-10T14:30:00.000Z',
  limitReached: true,    // the limit has passed: examine her
  delayed: false,        // an exam past the limit found no progress
  delayedAt: null,
}
```

## How it works

**Start.** Active labour starts at the first cervix exam of 5 cm or more. Every `hour` counts from
that exam, and earlier readings are reported as `before-start`.

**Time at each centimetre.** WHO replaced the partograph's 1 cm per hour lines with a time limit for
each centimetre: 6 hours at 5 cm, 5 at 6 cm, 3 at 7 cm, 2.5 at 8 cm and 2 at 9 cm. The clock for a
centimetre starts at the exam that first finds it, and a later exam that reads lower never resets
it. The alert needs an exam: `cervix-progress-delayed` is raised only when an exam at or after the
limit finds no progress, and it is dated at that exam. An exam that finds progress never raises it,
however long the gap between exams.

**Second stage.** The second stage starts at the first 10 cm exam. `second-stage-prolonged` is
raised after 3 hours for a nulliparous woman and 2 hours otherwise. When parity is missing, the
stricter 2 hours applies.

**Alerts.** Every reading is checked against the guide's alert values (see [Rules](#rules)). On the
paper form the midwife circles these; here each one is a finding with the reading's `id`.

**Due checks.** Each check is due one interval after it was last done, or after the start if it was
never done. Second-stage intervals apply once she is fully dilated.

**Grid.** The first stage has hourly columns, at least 12, as on the form. The second stage has
hourly columns from full dilatation, at least 3. Readings keep their exact `hour`, so the two
half-hourly fetal heart rates of an hour share a column. Rows follow the form's sections:
`supportiveCare`, `baby`, `woman`, `progress` and `medication`.

## Rules

Defaults live in `WHO_LABOUR_CARE_GUIDE_RULES`, and you override them the same way as the
partograph's (see [Local rules](partograph.md#local-rules)). Sources are listed in the
[README](../README.md#sources).

| Rule                               | Default                                                      | Source              |
| ---------------------------------- | ------------------------------------------------------------ | ------------------- |
| Active labour starts               | 5 cm                                                         | LCG 2021            |
| Time at each centimetre            | 5 cm: 6 h, 6 cm: 5 h, 7 cm: 3 h, 8 cm: 2.5 h, 9 cm: 2 h      | LCG 2021            |
| Second stage                       | 3 h nulliparous, 2 h multiparous, from full dilatation       | LCG manual 2020     |
| Fetal heart rate                   | every 30 min (every 5 min in stage 2)                        | LCG manual 2020     |
| Decelerations                      | every 30 min (every 5 min in stage 2)                        | LCG manual 2020     |
| Contractions                       | every 30 min (every 15 min in stage 2)                       | LCG manual 2020     |
| Supportive care                    | every hour                                                   | LCG manual 2020     |
| Pulse, temperature, BP             | every 4 h                                                    | LCG manual 2020     |
| Urine                              | every 4 h                                                    | LCG manual 2020     |
| Vaginal exam                       | every 4 h in the first stage                                 | LCG manual 2020     |
| Companion, pain relief, oral fluid | `no` (not `declined`)                                        | LCG 2021            |
| Posture                            | supine                                                       | LCG 2021            |
| Fetal heart rate                   | below 110, or 160 and above; urgent below 100 or above 180   | LCG 2021, MCPC 2017 |
| Decelerations                      | late                                                         | LCG 2021            |
| Amniotic fluid                     | meconium +++ (or ungraded) or blood-stained                  | LCG 2021            |
| Fetal position                     | posterior or transverse                                      | LCG 2021            |
| Caput, moulding                    | +++                                                          | LCG 2021            |
| Contractions                       | 2 or fewer or more than 5 in 10 min; under 20 s or over 60 s | LCG 2021            |
| Pulse                              | below 60, or 120 and above                                   | LCG 2021            |
| Blood pressure                     | systolic below 80 or 140 and above, diastolic 90 and above   | LCG 2021            |
| Temperature                        | below 35.0, or 37.5 °C and above                             | LCG 2021            |
| Urine                              | protein or acetone ++ and above                              | LCG 2021            |

LCG alerts are `watch`. Three come from MCPC and are `urgent`: a fetal heart rate in the distress
range, blood pressure of 160/110 or more, and excessive contractions while oxytocin runs.

### Open clinical questions

Two rules are read in the stricter way, which alerts earlier. A clinician should confirm them before
they are relaxed:

- **Contractions.** WHO says to count again over another 10 minutes and alert only if the count is
  confirmed. The guide alerts on the first count.
- **Second-stage clock.** WHO counts the limit from the start of the active second stage. The guide
  starts it at full dilatation, not at `pushingAt`.

### Not modelled

- **Shared decision-making** (assessment, plan and initials) is free text written and signed by a
  clinician. It belongs in the health record next to the guide.
- **15-minute cells in the second stage.** Readings keep their exact time, but the grid has no
  15-minute cell.
- **A new form after 12 hours.** The paper form says to start a new guide; the grid just grows.

## Worked example

WHO's user's manual follows one woman, Mary Jane, through a normal labour: 5 cm at 06:00, 8 cm at
10:00, fully dilated at 13:00 and birth at 13:45. Her chart is a test,
[`test/lcg/worked-example.test.ts`](../test/lcg/worked-example.test.ts). It raises no progress alert
and flags only the observations WHO marks: no companion or pain relief at 06:00 and 10:00, a supine
posture, and the posterior and transverse positions.

## Exports

| Export                                   | Description                    |
| ---------------------------------------- | ------------------------------ |
| `buildLabourCareGuide(input)`            | builds the guide               |
| `WHO_LABOUR_CARE_GUIDE_RULES`            | the frozen WHO defaults        |
| `resolveLabourCareGuideRules(overrides)` | defaults merged with overrides |

Types: `LabourCareGuideInput`, `LabourCareGuide`, `StartedLabourCareGuide`,
`NotStartedLabourCareGuide`, `LabourCareGuideStatus`, `LabourCareGuideHeader`, `LabourOnset`,
`CentimetreProgress`, `SecondStageProgress`, `LabourCareGrid`, `LabourCareRows`,
`LabourCareSections`, `LabourCareDueCheck`, `LabourCareGuideRules`, `LabourCareGuideRuleOverrides`,
`LabourCareCervixRules`, `CervixAlertHours`, `SecondStageAlertHours`, `LabourCareChartRules`,
`LabourCareCheck`, `LabourCareIntervals`.
