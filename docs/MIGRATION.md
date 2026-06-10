# Migration: PCA → Metis

Metis retains the `pca` CLI alias and legacy `.pca` artifact reads in this release.

## Command mapping

| Before | After |
| --- | --- |
| `pca scan` | `metis scan` |
| `pca plan` | `metis plan` |
| `pca init --dry-run` | `metis init --dry-run` |
| `pca init --apply --yes` | `metis init --apply --yes` |
| `pca rollback <id>` | `metis rollback <id>` |

New product-grade commands:

- `metis doctor` — diagnostics without writes
- `metis tui` — primary interactive workflow
- `metis gui --preview` — static read-only dashboard
- `metis evolve --save-proposal --yes` — explicit proposal persistence
- `metis proposal …` — list, inspect, dismiss, accept

## Artifact mapping

| Legacy | Metis |
| --- | --- |
| `.pca/evidence/index.json` | `.metis/evidence/index.json` |
| `.pca/rollback/pca-<id>.json` | `.metis/rollback/metis-<id>.json` |
| n/a | `.metis/proposals/metis-proposal-<id>.json` |

Metis reads legacy `.pca` evidence and rollback records when `.metis` artifacts are absent.

## Marker migration

Existing `<!-- PCA:BEGIN -->` sections are migrated to a single `<!-- METIS:BEGIN -->` managed block on apply. Manual content outside markers is preserved.

## Rollback IDs

New applies create `metis-<timestamp>` rollback ids. Legacy `pca-<timestamp>` ids remain restorable.
