# Core

`@hisprwanda/who-labour/core` is the shared foundation of the partograph and the Labour Care Guide.
It defines what a reading looks like, checks readings for bad data, and classifies single values
against clinical limits.

Most apps never import it directly: `buildPartograph` and `buildLabourCareGuide` already use it. Reach
for it when you want to validate readings before saving them, or to flag one value as it is entered.

```ts
import { classifyFetalHeartRate, normalizeReadings } from '@hisprwanda/who-labour/core';

classifyFetalHeartRate(165, {
  lowBelow: 110,
  highFrom: 160,
  distressBelow: 100,
  distressAbove: 180,
});
// { code: 'fetal-heart-rate-high', severity: 'watch' }

const { readings, issues } = normalizeReadings([
  { kind: 'pulse', at: '2026-01-10T08:00:00Z', beatsPerMinute: 88 },
  { kind: 'pulse', at: '2026-01-10 08:00', beatsPerMinute: 90 },
]);
// readings: the first pulse, with `time` and `index` added
// issues: [{ index: 1, code: 'invalid-time' }]
```

## Readings

A reading is one observation: a `kind`, the time it was taken (`at`), and its values. Pass your own
`id` (for example the observation id in your health record) and it comes back on every finding and
issue that reading causes.

```ts
{ kind: 'blood-pressure', at: '2026-01-10T08:00:00+02:00', systolic: 120, diastolic: 80, id: 'obs-42' }
```

`at` is a `Date`, epoch milliseconds, or an ISO 8601 string with `Z` or an offset. A string without
a zone is rejected, because its meaning would depend on the device's time zone.

| `kind`             | Values                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `fetal-heart-rate` | `beatsPerMinute`                                                                         |
| `decelerations`    | `type`: `none`, `early`, `late` or `variable`                                            |
| `amniotic-fluid`   | `state`: `intact`, `ruptured`, `clear`, `meconium`, `blood` or `absent`; `meconiumGrade` |
| `fetal-position`   | `position`: `anterior`, `posterior` or `transverse`                                      |
| `caput`            | `grade`: 0 (none) to 3 (+++)                                                             |
| `moulding`         | `grade`: 0 (bones separated) to 3 (overlapped, not reducible)                            |
| `cervix`           | `dilatationCm`, 0 to 10                                                                  |
| `descent`          | `fifthsPalpable`, 5 to 0                                                                 |
| `contractions`     | `per10Minutes`, `durationSeconds`                                                        |
| `pulse`            | `beatsPerMinute`                                                                         |
| `blood-pressure`   | `systolic`, `diastolic` in mmHg                                                          |
| `temperature`      | `celsius`                                                                                |
| `urine`            | at least one of `protein` (0 to 4, or `trace`), `acetone` (0 to 4), `volumeMl`           |
| `companion`        | `given`: `yes`, `no` or `declined`                                                       |
| `pain-relief`      | `given`: `yes`, `no` or `declined`                                                       |
| `oral-fluid`       | `given`: `yes`, `no` or `declined`                                                       |
| `posture`          | `position`: `supine` or `mobile`                                                         |
| `oxytocin`         | `unitsPerLitre`, `dropsPerMinute` (0 means stopped)                                      |
| `drug`             | `name`, optional `dose` and `route`                                                      |
| `iv-fluid`         | `name`, optional `volumeMl` and `dropsPerMinute`                                         |

`meconiumGrade` is optional, 1 to 3 (+ to +++), and only allowed when `state` is `meconium`.
`declined` means the woman did not want that care, which is not the same as it not being offered.

Both tools accept every kind. The partograph charts the Labour Care Guide kinds (such as `companion`
or `caput`) but raises no findings for them.

## Validation

`normalizeReadings(readings, { notAfter })` returns the valid readings sorted by time, and an
`issues` list for the ones it left out. It never throws on bad clinical data.

| Issue code      | Meaning                                                |
| --------------- | ------------------------------------------------------ |
| `unknown-kind`  | not an object, or `kind` is not one of the kinds above |
| `invalid-time`  | `at` is missing, has no zone, or is not a real date    |
| `invalid-value` | a value is missing, of the wrong type, or out of range |
| `duplicate`     | same kind, time and values as an earlier reading       |
| `in-future`     | later than `notAfter` (the tools pass `now`)           |
| `before-start`  | added by the tools: taken before the chart started     |

Each issue has the reading's position in your input (`index`) and its `id` if you gave one. The
order of the input never changes the result.

## Classifiers

Each classifier takes one value and its limits, and returns an `Assessment` (`{ code, severity }`)
or `null` when the value is normal. The limits come from the rules of each tool, so the same
function serves both.

| Function                    | Flags                                                                           |
| --------------------------- | ------------------------------------------------------------------------------- |
| `classifyFetalHeartRate`    | low or high rate; `urgent` past the distress limits                             |
| `classifyDecelerations`     | late decelerations                                                              |
| `classifyAmnioticFluid`     | meconium (from a grade, when limits are given), blood, absent liquor            |
| `classifyFetalPosition`     | posterior or transverse position                                                |
| `classifyCaput`             | caput at or above the severe grade                                              |
| `classifyMoulding`          | moulding at or above the severe grade                                           |
| `classifyPulse`             | low or high pulse                                                               |
| `classifyBloodPressure`     | low or high; `urgent` when severely high                                        |
| `classifyTemperature`       | low or high temperature                                                         |
| `classifyUrine`             | protein and acetone; returns a list, one entry for each                         |
| `classifyContractions`      | partograph: inadequate or excessive                                             |
| `classifyContractionAlerts` | Labour Care Guide: too few, too many, too short or too long                     |
| `classifySupportiveCare`    | companion, pain relief or oral fluid answered `no`                              |
| `classifyPosture`           | lying supine                                                                    |
| `contractionDurationBand`   | not a check: the shading band for a contraction (under 20, 20 to 40, over 40 s) |

Excessive contractions are `urgent` while oxytocin is running; pass `true` as the third argument.

## Findings

A finding is an assessment tied to the reading that caused it:

```ts
{
  code: 'pulse-high',
  severity: 'watch',
  kind: 'pulse',
  at: '2026-01-10T10:00:00.000Z',
  hour: 2,            // hours from the start of the chart
  readingId: 'obs-42' // when the reading had an id
}
```

`severity` is `watch` (reassess, consider referral) or `urgent` (act now). Codes are stable strings;
translate them in your app.

| Code                                                                 | Raised by         |
| -------------------------------------------------------------------- | ----------------- |
| `fetal-heart-rate-low`, `fetal-heart-rate-high`                      | both              |
| `meconium-stained-liquor`, `blood-stained-liquor`                    | both              |
| `liquor-absent`                                                      | partograph        |
| `moulding-severe`                                                    | both              |
| `contractions-inadequate`, `contractions-excessive`                  | both              |
| `pulse-low`, `pulse-high`                                            | both              |
| `blood-pressure-low`, `blood-pressure-high`, `blood-pressure-severe` | both              |
| `temperature-low`, `temperature-high`                                | both              |
| `proteinuria`, `ketonuria`                                           | both              |
| `alert-line-crossed`, `action-line-crossed`                          | partograph        |
| `companion-absent`, `pain-relief-absent`, `oral-fluid-absent`        | Labour Care Guide |
| `supine-posture`, `late-decelerations`                               | Labour Care Guide |
| `fetal-position-abnormal`, `caput-severe`                            | Labour Care Guide |
| `cervix-progress-delayed`, `second-stage-prolonged`                  | Labour Care Guide |

## Time helpers

| Export                         | Does                                      |
| ------------------------------ | ----------------------------------------- |
| `parseInstant(value)`          | epoch ms for a valid `Instant`, or `null` |
| `toIsoString(ms)`              | ISO 8601 string in UTC                    |
| `hoursBetween(from, to)`       | hours between two epoch ms values         |
| `MS_PER_HOUR`, `MS_PER_MINUTE` | constants                                 |

`parseInstant` checks calendar fields itself, so `2026-02-31` is rejected instead of rolling over
to March.

## Exports

Functions: `normalizeReadings`, `parseInstant`, `toIsoString`, `hoursBetween`, `MS_PER_HOUR`,
`MS_PER_MINUTE`, and every classifier in the table above.

Types:

- Readings: `Reading`, `ReadingKind`, `ReadingOfKind`, `ReadingBase`, `TimedReading`, `Instant`,
  and one `...Reading` type for each kind.
- Values: `AmnioticFluid`, `MeconiumGrade`, `MouldingGrade`, `CaputGrade`, `DecelerationType`,
  `FetalPosition`, `FifthsPalpable`, `DipstickGrade`, `ProteinResult`, `SupportiveCareAnswer`,
  `Posture`.
- Results: `Assessment`, `Finding`, `FindingCode`, `Severity`, `ReadingIssue`, `ReadingIssueCode`,
  `NormalizeOptions`, `NormalizedReadings`, `ScheduledCheck`.
- Limits: `FetalHeartRateLimits`, `AmnioticFluidLimits`, `MouldingLimits`, `CaputLimits`,
  `PulseLimits`, `BloodPressureLimits`, `TemperatureLimits`, `UrineLimits`, `ContractionLimits`,
  `ContractionAlertLimits`, `ContractionDurationBand`, `SupportiveCareKind`.
- Utility: `DistributiveOmit`.
