# Metis Product Requirements Document

## Summary

Metis (`metis`) turns local AI coding-agent evidence into a reviewable, reversible personal agent scaffold. It supports Claude Code, Codex, Cursor rule output, and project command evidence without requiring accounts, hosted processing, runtime dependencies, or telemetry.

Metis is deliberately personal and small: a calm local review room for repeated AI coding corrections, not a hosted memory product, model gateway, or workflow takeover. The product should help developers keep rules short, private, reviewable, and reversible across tools.

The primary workflow is terminal-first via `metis tui`. GUI is a read-only static preview in the first release.

## MVP Scope

The usable MVP includes:

- safe root-scoped CLI parsing for `scan`, `plan`, `init`, `rollback`, `evolve`, `tui`, and `gui --preview`
- shared workflow API reused by CLI, TUI, and GUI
- Claude Code, Codex, and project evidence adapters
- redaction for secret-like values, private paths, private hosts, high-entropy strings, and prompt-injection markers
- deterministic evidence records and evidence-backed candidates
- safety audit before generation/apply
- unified dry-run diffs for `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/personal-agent.mdc`, and `.metis/evidence/index.json`
- explicit apply with `--apply --yes` or TUI `APPLY METIS` confirmation
- rollback from `.metis/rollback/<id>.json` with legacy `.pca` read compatibility
- proposal-only evolution with `evolve --dry-run`
- read-only GUI static HTML preview (no localhost server)
- `pca` compatibility alias for one release
- fixture-driven tests for happy paths, invalid args, redaction, no writes, apply/rollback, symlink root rejection, UI canary redaction, and remote-call static checks

## Non-Goals

- chat UI or chat runtime
- hosted memory
- LLM calls
- cloud sync
- telemetry
- full transcript understanding
- automatic permissions or hook enablement
- silent self-evolution
- GUI apply/rollback controls in first release
- GUI localhost server in first release

## User Stories

### TUI

As a developer, I can run `metis tui` and complete scan → plan → diff preview → apply confirmation → rollback without raw secret leakage.

Acceptance criteria:

- non-TTY without `--script` exits 2 with guidance
- apply requires exact `APPLY METIS` after audit passes
- audit failure blocks apply
- scripted mode supports deterministic QA

### Scan

As a developer, I can run `metis scan --fixture <path>` and see supported local evidence without writes or raw secret display.

### Plan

As a developer, I can run `metis plan` and see evidence-backed candidates with evidence ids, confidence, targets, risk, and decision.

### Dry Run

As a developer, I can run `metis init --dry-run` and review real diffs without writes.

### Apply And Rollback

As a developer, I can apply after review and roll back using `metis-<timestamp>` ids.

### GUI Preview

As a developer, I can run `metis gui --preview` and open a read-only HTML dashboard with evidence, candidates, audit, diff, and rollback metadata.

### Evolve

As a developer, I can run `metis evolve --dry-run` to compare current evidence with `.metis/evidence/index.json` (or legacy `.pca` index).

## Verification

```bash
npm test
node bin/metis.js scan --fixture test/fixtures/mixed-agent-project
node bin/metis.js tui --fixture test/fixtures/mixed-agent-project --script test/fixtures/tui/dry-run.txt
node bin/metis.js gui --preview --fixture test/fixtures/mixed-agent-project --out /tmp/metis-preview.html
```
