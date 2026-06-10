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
```

## CLI Contract

- `tui` runs the terminal-first interactive workflow via shared workflows and view models.
- `scan` resolves a root, runs adapters, prints metadata/redacted evidence, and writes nothing.
- `plan` converts evidence into candidates with evidence ids, confidence, targets, risk, and decision.
- `init --dry-run` renders unified diffs for scaffold targets and writes nothing.
- `init --apply --yes` reuses the same generation path, runs safety audit, creates rollback metadata, then writes whitelisted files.
- `rollback <id>` validates and restores a rollback record (`.metis` or legacy `.pca`).
- `evolve --dry-run` compares current evidence with evidence index and proposes additions/removals only.
- `gui --preview` snapshots workflow data once and writes static HTML; no server, no writes to project files.

## Artifacts

Canonical paths:

- `.metis/evidence/index.json`
- `.metis/rollback/metis-<timestamp>.json`

Legacy compatibility:

- read `.pca/evidence/index.json` when `.metis` index is absent
- read `.pca/rollback/pca-<timestamp>.json` for legacy rollback ids
- migrate `<!-- PCA:BEGIN -->` sections to `<!-- METIS:BEGIN -->`

## Adapters

Adapters receive a context with root, options, redactor, and evidence builder. They never print, execute hooks, traverse symlinks, or read outside the scan root.

## Safety And Writes

The safety auditor blocks high-risk generated output. The applier writes only whitelisted scaffold paths and Metis rollback metadata. TUI apply requires explicit confirmation. GUI preview is read-only.
