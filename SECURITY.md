# Security policy

## Supported versions

Security fixes are released for the latest minor version.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through
[GitHub private vulnerability reporting](https://github.com/hisprwanda/who-labour/security/advisories/new).

We aim to acknowledge reports within 3 working days and to agree on a disclosure date with you.

Calculation errors that could affect patient care are also treated as security issues. Report them
privately the same way if they are not yet public.

## Supply chain

- The published package has no runtime dependencies.
- Releases are built and published from GitHub Actions with npm provenance, using npm trusted
  publishing; no long-lived npm token exists.
