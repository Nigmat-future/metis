# Changelog

## 0.3.0 — Product-grade release

### Added

- `metis doctor` read-only diagnostics and aligned first-run onboarding
- Proposal persistence under `.metis/proposals/` with explicit save/review lifecycle
- `metis proposal list|inspect|dismiss|accept` CLI workflow
- TUI proposal review commands (`save-proposal --yes`, `proposal-list`, `proposal-inspect latest`, etc.)
- GUI dashboard search/filter/detail panels and in-browser redacted JSON export
- Portable release gates: `npm run check`, `smoke:install`, `qa:product`, `evidence:release`, `ci:local`
- Product documentation: migration, troubleshooting, release checklist, proposals guide

### Changed

- GUI preview reorganized into semantic dashboard sections with side navigation
- TUI v3 welcome panel, 80/100/140 column layouts, scripted Tab completion fixtures
- README quick start now recommends `doctor` → `scan` before any write

### Security

- Proposal artifact store with lock, max-size enforcement, and path allowlists
- Expanded canary scans across CLI, TUI, GUI export payloads, and QA artifacts

## 0.2.0

- Product-grade baseline spec (`docs/PRODUCT-GRADE.md`)
- Portable `npm run check` scripts
- TUI runtime decomposition

## 0.1.0

- Terminal-first Metis MVP with TUI, read-only GUI preview, and `pca` compatibility alias
