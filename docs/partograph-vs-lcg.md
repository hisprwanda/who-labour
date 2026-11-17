# Partograph and Labour Care Guide

For decades, WHO recommended the partograph for monitoring labour. In 2018, new WHO intrapartum care
recommendations showed that many healthy women progress more slowly than 1 cm per hour and still give
birth normally. The partograph's alert line, built on that rate, sent too many women towards
interventions they did not need. In 2020, WHO published the Labour Care Guide (LCG) to replace it.

The LCG keeps what worked in the partograph and adds three things: care that makes labour a better
experience for the woman (a companion, pain relief, fluids, moving freely), a reference value for
every observation, and a written plan agreed with the woman at each assessment.

This library supports both, because many facilities still use the partograph while they move to the
LCG. Both tools read the same readings.

## What changes

|                         | Partograph                                 | Labour Care Guide                                                 |
| ----------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Active labour starts at | 4 cm                                       | 5 cm                                                              |
| Normal progress         | 1 cm per hour, with alert and action lines | a time limit for each centimetre, from 6 h at 5 cm to 2 h at 9 cm |
| Abnormal observations   | lines on the cervicograph, and a FHR range | an "Alert" value for every row, circled when met                  |
| Second stage            | not charted                                | its own columns, with a time limit by parity                      |
| Pushing                 | not recorded                               | marked with `P`                                                   |
| Plan of care            | not recorded                               | an assessment, a plan and the provider's initials                 |

## What each records

"Library" says how this package handles it. Kinds like `companion` are readings; header fields are
inputs to `buildLabourCareGuide`.

| Observation                             | Partograph | LCG | Library                                                    |
| --------------------------------------- | ---------- | --- | ---------------------------------------------------------- |
| Name and parity                         | yes        | yes | `parity`; the name stays in your health record             |
| Gravidity, admission date               | yes        | no  | not modelled                                               |
| Date active labour was diagnosed        | no         | yes | `startedAt` / `header.activeLabourAt`, from the first exam |
| Time membranes ruptured                 | yes        | yes | `membranesRuptured`, `membranesRupturedAt` (LCG)           |
| Spontaneous or induced labour           | no         | yes | `labourOnset` (LCG)                                        |
| Risk factors                            | no         | yes | `riskFactors` (LCG)                                        |
| Companion, pain relief, fluids, posture | no         | yes | readings; only the LCG raises alerts                       |
| Fetal heart rate                        | yes        | yes | `fetal-heart-rate`                                         |
| Decelerations                           | no         | yes | `decelerations`                                            |
| Amniotic fluid                          | yes        | yes | `amniotic-fluid`, with a meconium grade for the LCG        |
| Fetal position, caput                   | no         | yes | `fetal-position`, `caput`                                  |
| Moulding                                | yes        | yes | `moulding`                                                 |
| Pulse, blood pressure, temperature      | yes        | yes | `pulse`, `blood-pressure`, `temperature`                   |
| Urine volume                            | yes        | no  | `urine.volumeMl`, charted but never flagged                |
| Urine protein and acetone               | yes        | yes | `urine.protein`, `urine.acetone`                           |
| Contraction frequency and length        | yes        | yes | `contractions`                                             |
| Contraction strength                    | yes        | no  | not modelled                                               |
| Cervical dilatation, descent            | yes        | yes | `cervix`, `descent`                                        |
| Oxytocin, medicines, IV fluids          | yes        | yes | `oxytocin`, `drug`, `iv-fluid`                             |
| Assessment, plan, initials              | no         | yes | not modelled; keep them in the health record               |

## Moving an app from the partograph to the LCG

Your readings don't change. Call `buildLabourCareGuide` instead of `buildPartograph`, and add the
readings the LCG asks for (supportive care, decelerations, fetal position, caput) when you can.

What changes in the result:

- **Start.** The guide starts at 5 cm, so an exam at 4 cm becomes `before-start`. `status` is
  `active-first-stage`, `second-stage` or `birth`.
- **Progress.** There are no lines or zones. Read `progress.limitReached` (an exam is due) and the
  `cervix-progress-delayed` finding (an exam found no progress) instead of `zone` and the
  line-crossed findings.
- **Second stage.** `secondStage` tracks time from full dilatation, and `second-stage-prolonged` is
  raised at 3 hours for a first birth and 2 hours otherwise. Pass `parity`.
- **Episode facts.** Pass `labourOnset`, `membranesRuptured(At)`, `riskFactors`, `pushingAt` and
  `birthAt` when you have them. They come back in `header`.
- **Checks.** Pulse and temperature move to every 4 hours; supportive care is checked every hour;
  urine every 4 hours.
- **Grid.** Hourly columns with rows grouped by section, instead of half-hour columns with rows by
  reading kind.

See [Partograph](partograph.md) and [Labour Care Guide](lcg.md) for the full details.
