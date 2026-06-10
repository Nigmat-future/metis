# Evolve Proposals

Proposals capture redacted evolve deltas for explicit human review. They do **not** auto-apply.

## Schema

Files: `.metis/proposals/metis-proposal-<timestamp>.json`

See `docs/PRODUCT-GRADE.md` for the full schema (`schemaVersion`, `status`, `baselineEvidenceHash`, `changes`, `audit`, `redactionStatus`).

## Lifecycle

1. **Review** — `metis evolve --dry-run` (read-only stdout)
2. **Save** — `metis evolve --save-proposal --yes` (writes one proposal file)
3. **List** — `metis proposal list`
4. **Inspect** — `metis proposal inspect <id>`
5. **Dismiss** — `metis proposal dismiss <id> --yes` (status only)
6. **Accept dry-run** — `metis proposal accept <id> --dry-run`
7. **Accept apply** — `metis proposal accept <id> --apply --yes` (rollback metadata first)

TUI equivalents use scripted/interactive commands such as `save-proposal --yes`, `proposal-list`, `proposal-dismiss <id> --yes`, and `proposal-accept-dry-run latest`. TUI scaffold writes still require `APPLY METIS`.

## Accept semantics

Proposals are **review artifacts**, not frozen executable patches. `proposal accept` always:

1. Rescans the project
2. Verifies the current evidence baseline hash still matches `baselineEvidenceHash`
3. Regenerates scaffold output from the current pipeline
4. Requires `--dry-run` before `--apply --yes`

If evidence changed after save, accept is blocked until you save a new proposal.

## Redaction

Proposal records store redacted candidate summaries only. Raw secrets, private paths, and prompt-injection markers must never appear in proposal JSON, CLI output, TUI transcripts, or GUI export payloads.

## Safety

- `evolve --dry-run` never writes proposals
- Save requires explicit `--yes`
- Accept apply reuses safety audit, generation, rollback, and apply gates
- Applied proposals cannot be accepted again
- Dismiss requires explicit `--yes` in CLI and TUI
- Concurrent writes use `.metis/.lock` with stale-lock recovery
