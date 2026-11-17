# Documentation

- [Core](core.md): readings, validation, classifiers and finding codes, shared by both tools.
- [Partograph](partograph.md): the WHO modified partograph, with its alert and action lines.
- [Labour Care Guide](lcg.md): the WHO Labour Care Guide, with time limits for each centimetre.
- [Partograph and Labour Care Guide](partograph-vs-lcg.md): how the two differ, and how to move an
  app from one to the other.

## The basics

Both tools work the same way:

1. **Readings in.** You pass every observation for one labour, in any order. Each reading has a
   `kind`, a time `at` with a zone, its values, and optionally your own `id`.
2. **Plain JSON out.** The result has ISO times in UTC, durations in hours or minutes, and string
   codes your app translates. You can store it, send it, or render it as it is.
3. **Bad data never throws.** A reading that can't be used is left out and listed in `issues`, with
   its position in your input and its `id`. Only programmer errors throw a `TypeError`, such as an
   invalid `now` or invalid rules.
4. **Findings have a severity.** `watch` means reassess or consider referral. `urgent` means act now.
5. **Rules are data.** Every clinical number lives in a frozen rules object with its source. A
   country or facility can override any of them.

The same readings always give the same result, whatever their order, so you can rebuild the chart
whenever a reading is added.
