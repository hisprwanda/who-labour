# Contributing

Thank you for helping improve `@hisprwanda/who-labour`. Clinical tools depend on this library, so
correctness comes before features.

## Getting started

You need Node.js 22 or newer and pnpm (the version is pinned in `package.json`; run
`corepack enable` to get it).

```sh
pnpm install
pnpm verify
```

`pnpm verify` runs lint, formatting, type checks, tests with coverage, the build and the package
export checks. CI runs the same command.

## Pull requests

- Open an issue first for new features or behaviour changes.
- Use a [Conventional Commits](https://www.conventionalcommits.org) title, for example
  `feat: add second-stage descent check` or `fix: include the action line itself`. Releases and the changelog are
  generated from these titles, and pull requests are squash merged.
- Add tests for every change. Changes to clinical rules need a test and a citation of the WHO document and page they follow.
- Any change that alters a finding, zone or due time for the same input is breaking: mark it with
  `!` (for example `fix!: ...`) and explain it in the description.
- Keep the public API typed and self-explanatory. Comments are one-line summaries on exported
  declarations, and elsewhere only when the code cannot say it.

## Clinical rules

Every number lives in `src/partograph/rules.ts` with a one-line source. When you change one, update
the "Rules and sources" table in the README and say in the pull request which document, edition and
page it comes from.

## Reporting a clinical accuracy problem

Use the "Clinical accuracy" issue template and include the inputs, the result you got, the result
you expected and its source (WHO document, edition and page).
