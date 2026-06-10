# Metis Product-Grade Baseline

This document locks release scope, schemas, and verification policy for the product-grade Metis release. Implementation and docs must not contradict this file.

## Product Promise

Metis is a **local-first**, **zero runtime dependency** scaffold manager for personal coding-agent rules. Terminal-first (`metis tui`) is the primary workflow. GUI is **read-only** static HTML preview in this release.

Product tone: calm, personal, local, and review-first. Metis should feel like a private rules companion that makes repeated AI coding corrections easier to inspect, approve, and reverse, not a large control console or hosted memory layer.

## Non-Goals (This Release)

- Chat runtime, cloud sync, hosted memory, model gateway, telemetry
- GUI apply/rollback mutation controls
- Localhost GUI server
- Automatic self-evolution apply
- Removal of `pca` alias (retained; migration documented only)

## Supported Commands

| Command | Writes | Notes |
| --- | --- | --- |
| `metis --help` / `pca --help` | none | `pca` shows deprecation notice |
| `metis doctor` | none | First-run diagnostics; recommends `scan` before any write |
| `metis scan` | none | |
| `metis plan` | none | |
| `metis init --dry-run` | none | |
| `metis init --apply --yes` | whitelist + rollback metadata | Rollback before scaffold writes |
| `metis rollback <id>` | restore whitelist paths | |
| `metis evolve --dry-run` | none | Transient output only |
| `metis evolve --save-proposal --yes` | `.metis/proposals/<id>.json` | Explicit save only |
| `metis proposal list` | none | |
| `metis proposal inspect <id>` | none | |
| `metis proposal dismiss <id> --yes` | proposal status only | |
| `metis proposal accept <id> --dry-run` | none | |
| `metis proposal accept <id> --apply --yes` | whitelist + rollback | Audit gates apply |
| `metis tui` | apply/rollback via `APPLY METIS` | Non-TTY without `--script` exits 2 |
| `metis gui --preview` | optional `--out` HTML only | No server; no project writes |

## First-Run Policy

All onboarding surfaces agree: **run `metis scan` or `metis tui` before any write**. `doctor` is the recommended diagnostic entry. Never recommend `--apply --yes` as the first action.

## Exit Codes

| Code | Meaning |
| --- | --- |
| 0 | Success |
| 1 | Operational failure (audit blocked, apply failed, unsafe proposal) |
| 2 | Usage error (bad args, non-TTY TUI, missing `--preview`) |

## Stdout / Stderr Policy

- Human-readable tables and frames go to **stdout**
- Usage errors and audit failures go to **stderr** for CLI; TUI shows errors in status strip
- JSON flags (`--json`) emit stable sorted JSON to stdout only
- No raw secrets, private paths, or prompt-injection markers in either stream

## Proposal Schema (`.metis/proposals/<id>.json`)

```json
{
  "schemaVersion": 1,
  "id": "metis-proposal-<timestamp>",
  "status": "pending|accepted|dismissed|applied",
  "createdAt": "<ISO-8601>",
  "baselineEvidenceHash": "<sha256-hex>",
  "changes": [],
  "audit": { "ok": true, "issues": [] },
  "redactionStatus": "redacted"
}
```

Constraints:

- Max serialized size: **256 KiB** (rejected before write)
- Only redacted evidence/candidate fields
- Writes only via explicit `evolve --save-proposal --yes` or TUI equivalent confirmation
- IDs: `metis-proposal-<timestamp>` (base36)

## Release Evidence Index Schema

File: `.omo/evidence/release-product-grade-index.json`

```json
{
  "schemaVersion": 1,
  "generatedAt": "<ISO-8601>",
  "entries": [
    {
      "command": "npm run check",
      "status": "pass|fail",
      "exitCode": 0,
      "stdoutPath": ".omo/evidence/...",
      "stderrPath": ".omo/evidence/...",
      "artifacts": [],
      "sha256": "<hex>",
      "startedAt": "<ISO-8601>",
      "durationMs": 0,
      "platform": "win32|linux|darwin",
      "nodeVersion": "v20.x.x",
      "redactionStatus": "clean|reviewed"
    }
  ]
}
```

## GUI Export Policy

- Inline zero-dependency browser JavaScript only (no CDN, no remote `script src`)
- Export is user-triggered download/copy of **redacted** dashboard JSON/text inside the browser
- Export must never write into the project tree
- No forms with submit actions; no `data-action` apply/rollback/write/mutate

## Canary Rules

Fake canaries used in tests and labeled security-doc examples only:

- `sk-pca-fake-secret`
- `ghp_abcdefghijklmnopqrstuvwxyz123456`
- `internal.customer.example`
- `C:\Users\VeryPrivateName` / `/Users/very-private-name`
- Prompt-injection phrases

Runtime artifacts (stdout, stderr, JSON, proposals, TUI transcripts, GUI HTML, scaffold files, release evidence) must not contain raw canaries.

## Cross-Platform Policy

All maintainer scripts use Node.js stdlib only. No Bash-only `find`, `cp`, or `mktemp` in `npm run` gates.

## Compatibility (This Release)

- `pca` bin alias remains
- Read legacy `.pca/evidence/index.json` and `.pca/rollback/pca-*.json`
- Migrate `<!-- PCA:BEGIN -->` to single `<!-- METIS:BEGIN -->` section
