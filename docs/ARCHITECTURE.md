# Architecture

Metis is a zero-runtime-dependency CommonJS CLI for Node.js 18+. It is organized as a local scanner, planner, scaffold generator, applier, rollback tool, and multi-surface workflow layer.

## Flow

```text
bin/metis.js (bin/pca.js alias)
  -> lib/cli/args.js
  -> lib/cli/commands.js
  -> lib/workflows/*
  -> lib/adapters/*
  -> lib/core/redactor.js
  -> lib/core/evidence.js
  -> lib/extractor/behavior.js
  -> lib/planner/candidates.js
  -> lib/auditor/safety.js
  -> lib/generator/scaffold.js
  -> lib/applier/apply.js / rollback.js
  -> lib/ui/view-model.js
  -> lib/tui/* (terminal workflow)
  -> lib/gui/* (static HTML preview)
  -> lib/workflows/driver.js
  -> lib/driver/* (launch local agent CLIs)
```

## CLI Contract

- `tui` runs the terminal-first interactive workflow via shared workflows and view models.
- `scan` resolves a root, runs adapters, prints metadata/redacted evidence, and writes nothing.
- `plan` converts evidence into candidates with evidence ids, confidence, targets, risk, and decision.
- `init --dry-run` renders unified diffs for scaffold targets and writes nothing.
- `init --apply --yes` reuses the same generation path, runs safety audit, creates rollback metadata, then writes whitelisted files.
- `rollback <id>` validates and restores a rollback record (`.metis` or legacy `.pca`).
- `evolve --dry-run` compares current evidence with evidence index and proposes additions/removals only.
- `note "<correction>"` appends one redacted, classified correction to `.metis/corrections/log.jsonl` and writes nothing else.
- `learn --source <claude|git|all>` discovers corrections from local transcripts and git revert history; `--dry-run` previews them, `--yes` appends de-duplicated records to the corrections log.
- `gui --preview` snapshots workflow data once and writes static HTML; no server, no writes to project files.
- `agents` lists supported agent CLIs and detects which are installed, writing nothing.
- `run <agent> "<prompt>"` previews the exact CLI command (`--dry-run`) or executes it (`--yes`); `--interactive` runs a multi-turn session and `--attach` hands the terminal to the agent's own interface.

## Artifacts

Canonical paths:

- `.metis/evidence/index.json`
- `.metis/rollback/metis-<timestamp>.json`
- `.metis/corrections/log.jsonl`

Legacy compatibility:

- read `.pca/evidence/index.json` when `.metis` index is absent
- read `.pca/rollback/pca-<timestamp>.json` for legacy rollback ids
- migrate `<!-- PCA:BEGIN -->` sections to `<!-- METIS:BEGIN -->`

## Adapters

Adapters receive a context with root, options, redactor, and evidence builder. They never print, execute hooks, traverse symlinks, or read outside the scan root.

## Corrections

Metis learns from repeated corrections as a first-class evidence source, distinct from the static repo scan:

- `lib/core/correction-signals.js` is a pure, dependency-free classifier: it decides whether a string is a correction (negation, re-instruction, or undo — English and Simplified Chinese) and produces a normalized fingerprint for clustering.
- `lib/core/corrections-store.js` is the append-only JSON Lines store at `.metis/corrections/log.jsonl`. Every record is redacted at write time and reads tolerate corrupt lines.
- `lib/adapters/transcript.js` reads Claude Code transcripts under `<home>/.claude/projects/<encoded-root>/*.jsonl` only on explicit `learn`. `lib/adapters/git-history.js` reads commit subjects to find revert/undo patterns with an injectable `git` runner.
- `lib/extractor/corrections.js` clusters records by fingerprint (Jaccard token overlap) and counts frequency. `lib/adapters/corrections.js` emits one evidence record per cluster, and `lib/extractor/behavior.js` turns correction evidence into frequency-bearing behaviors that the planner scores higher the more a correction recurs.

## Driver

The driver launches the coding-agent CLIs already installed on the machine (`claude`, `codex`, `opencode`, `cursor`). Each agent has a small declarative spec in `lib/driver/agents.js` describing its one-shot, continue, and attach invocations, mirroring a per-agent skill file. Spawning is isolated in `lib/driver/spawn.js` (synchronous `spawnSync`, injectable for tests) so the rest of the driver stays deterministic.

Execution is opt-in: `run` requires `--dry-run` or `--yes`, matching the apply gate. The driver performs no network I/O of its own, and resolves binaries against PATH (honouring `PATHEXT` on Windows plus a `METIS_DRIVER_BIN_<AGENT>` override). Interactive sessions reuse each agent's headless resume/continue flags instead of a pseudo-terminal, which keeps multi-turn driving cross-platform.

## Safety And Writes

The safety auditor blocks high-risk generated output. The applier writes only whitelisted scaffold paths and Metis rollback metadata. TUI apply requires explicit confirmation. GUI preview is read-only.
