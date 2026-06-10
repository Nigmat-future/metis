# Release Checklist

## Maintainer gates

```bash
npm run check
npm run smoke:install
npm run qa:product
npm run evidence:release
```

Or run the combined local CI script:

```bash
npm run ci:local
```

## Pre-release verification

1. `npm run check` — syntax, LOC, no-network, docs, tests, package allowlist
2. `npm run smoke:install` — pack, install tarball, exercise installed bins
3. `npm run qa:product` — CLI/TUI/GUI/sensitive matrix with canary scan
4. `npm run evidence:release` — write `.omo/evidence/release-product-grade-index.json`
5. `npm pack --dry-run` — confirm publishable file list

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs the same gates on Ubuntu and Windows with Node.js 18 and 20.

## Changelog and docs

- Update `CHANGELOG.md`
- Verify `docs/MIGRATION.md`, `docs/TROUBLESHOOTING.md`, `docs/PROPOSALS.md`, and `README.md`
- Run `npm run check:docs`

## Rollback plan

If a published release regresses:

1. Stop recommending the affected version in docs
2. Restore users via `metis rollback <id>` using pre-apply rollback metadata
3. Document the issue in `CHANGELOG.md` and `docs/TROUBLESHOOTING.md`

Publishing and tagging remain manual in this release.
