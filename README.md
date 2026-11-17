# @hisprwanda/who-labour

WHO labour monitoring for JavaScript and TypeScript. Pass the observations of one labour and get
back a chart, the findings that need attention, and the checks that are due, for two WHO tools:

- The **WHO modified partograph**, with its alert and action lines
- The **WHO Labour Care Guide** (LCG), with a time limit for each centimetre, supportive care and an
  alert value for every observation

It is made of pure functions with no runtime dependencies. It ships ESM and CommonJS with types, runs
in Node.js 22+, browsers and React Native, and returns plain JSON.

> This library supports clinical decisions. It is not a medical device and does not replace
> clinical judgement or local protocols.

## Install

```sh
npm install @hisprwanda/who-labour
```

## Usage

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
  guide.findings; // [{ code: 'companion-absent', severity: 'watch', ... }]
  guide.progress?.limitReached; // true: 3 hours at 7 cm, time to examine her
  guide.due; // when each routine check is next due
}
```

The partograph works the same way:

```ts
import { buildPartograph } from '@hisprwanda/who-labour/partograph';

const partograph = buildPartograph({ readings, now });
```

## Documentation

- [Core](https://github.com/hisprwanda/who-labour/blob/main/docs/core.md): readings, validation,
  classifiers and finding codes
- [Partograph](https://github.com/hisprwanda/who-labour/blob/main/docs/partograph.md)
- [Labour Care Guide](https://github.com/hisprwanda/who-labour/blob/main/docs/lcg.md)
- [Partograph and Labour Care Guide](https://github.com/hisprwanda/who-labour/blob/main/docs/partograph-vs-lcg.md):
  how they differ, and how to move from one to the other

| Entry point                         | Contains                             |
| ----------------------------------- | ------------------------------------ |
| `@hisprwanda/who-labour/lcg`        | the Labour Care Guide                |
| `@hisprwanda/who-labour/partograph` | the partograph                       |
| `@hisprwanda/who-labour/core`       | readings, validation and classifiers |
| `@hisprwanda/who-labour`            | everything above                     |

## Sources

Every clinical value cites one of these documents. If a value differs from its source, please open a
"Clinical accuracy" issue.

- **WHO 2018:** World Health Organization. [_WHO recommendations: intrapartum care for a positive childbirth experience._ Geneva: WHO; 2018.](https://www.who.int/publications/i/item/9789241550215)
- **WHO 1994:** World Health Organization. [_The partograph: the application of the WHO partograph in the management of labour._ WHO/FHE/MSM/93.8. Geneva: WHO; 1994.](https://iris.who.int/items/aee82e8e-8b3b-4a81-ac22-5fb75ebbbfa9)
- **MCPC 2017:** World Health Organization. [_Managing complications in pregnancy and childbirth: a guide for midwives and doctors._ 2nd ed. Geneva: WHO; 2017.](https://www.who.int/publications/i/item/9789241565493)
- **LCG 2021:** World Health Organization. [_WHO labour care guide_ (form). Geneva: WHO; 2021.](https://www.who.int/publications/i/item/9789240017566)
- **LCG manual 2020:** World Health Organization. [_WHO labour care guide: user's manual._ Geneva: WHO; 2020.](https://www.who.int/publications/i/item/9789240017566)
- **LCG policy brief 2022:** World Health Organization. [_Key points for considering adoption of the WHO labour care guide: policy brief._ Geneva: WHO; 2022.](https://www.who.int/publications/i/item/9789240055766)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). For security or clinical safety issues, see
[SECURITY.md](SECURITY.md).

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
