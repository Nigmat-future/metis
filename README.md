# Metis (`metis`)

> Turn repeated AI coding corrections into personal, local, reviewable rules.

Every developer slowly teaches their coding agents the same things:

- which test command actually matters
- which files should never be touched casually
- how much explanation is useful before edits
- which project rules are team policy and which are personal working style

That knowledge usually stays scattered across chats, `AGENTS.md`, `CLAUDE.md`,
Cursor rules, package scripts, and half-remembered corrections. Metis gathers
the local evidence, proposes short rules, and lets you decide what becomes part
of your personal coding scaffold.

Metis is intentionally small. It is not a hosted memory product, not a chat
runtime, and not a second agent trying to take over your workflow. It is a quiet
local review room for the rules that make your agents feel like they are yours.

## Before / After

Before:

```text
"Run npm test before you answer."
"Please keep replies in Simplified Chinese for this project."
"Do not turn every preference into a huge system prompt."
```

After:

```text
Metis finds the repeated pattern, shows the evidence, checks rule quality,
previews the diff, and writes only after you approve.
```

## Why It Exists

Agent tools already read project guidance: Codex uses `AGENTS.md`, Claude Code
uses `CLAUDE.md`, and Cursor uses project rules. Metis helps keep those files
short, aligned, private, and reversible across tools.

## First Run

First run is read-only: scan and review before any write.

```bash
node bin/metis.js doctor --fixture test/fixtures/mixed-agent-project
node bin/metis.js scan --fixture test/fixtures/mixed-agent-project
node bin/metis.js plan --fixture test/fixtures/mixed-agent-project
node bin/metis.js init --dry-run --fixture test/fixtures/mixed-agent-project
node bin/metis.js tui --fixture test/fixtures/mixed-agent-project --script test/fixtures/tui/dry-run.txt
```

| Step | Command | Writes? |
| --- | --- | --- |
| Diagnostics | `metis doctor` | No |
| Evidence scan | `metis scan` | No |
| Candidate review | `metis plan` | No |
| Diff preview | `metis init --dry-run` or TUI `preview-diff` | No |
| Apply | `metis init --apply --yes` or TUI `APPLY METIS` | Yes (rollback metadata first) |

Apply only after reviewing dry-run output (CLI or TUI):

```bash
TEMP_ROOT="$(mktemp -d)"
cp -R test/fixtures/mixed-agent-project/. "$TEMP_ROOT/"
node bin/metis.js init --apply --yes --fixture "$TEMP_ROOT"
node bin/metis.js rollback <rollback-id> --fixture "$TEMP_ROOT"
```

## Commands

| Command | Purpose |
| --- | --- |
| `metis doctor` | Read-only environment and artifact diagnostics |
| `metis tui` | Interactive terminal workflow (primary) |
| `metis scan` | Scan Claude Code, Codex, and project evidence |
| `metis plan` | Print candidates with evidence ids, confidence, targets, risk |
| `metis init --dry-run` | Print unified diffs, write nothing |
| `metis init --apply --yes` | Apply scaffold with rollback metadata |
| `metis rollback <id>` | Restore files from rollback record |
| `metis evolve --dry-run` | Propose small candidate changes, write nothing |
| `metis gui --preview` | Generate read-only static HTML dashboard |

Runtime stays zero-dependency CommonJS on Node.js 18 or newer.

## GUI Preview (Read-Only)

The first GUI release is a static HTML export. It does not start a localhost server and has no apply/rollback controls.

```bash
node bin/metis.js gui --preview --fixture test/fixtures/mixed-agent-project --out /tmp/metis-preview.html
```

Open the printed path in a browser to review evidence, candidates, safety audit, diff preview, rollback ledger, and saved proposal summaries. The dashboard supports search/filter/detail and in-browser redacted JSON export (no project writes).

## Evolve Proposals

```bash
node bin/metis.js evolve --dry-run --fixture test/fixtures/mixed-agent-project
node bin/metis.js evolve --save-proposal --yes --fixture test/fixtures/mixed-agent-project
node bin/metis.js proposal list --fixture test/fixtures/mixed-agent-project
node bin/metis.js proposal inspect <id> --fixture test/fixtures/mixed-agent-project
node bin/metis.js proposal accept <id> --dry-run --fixture test/fixtures/mixed-agent-project
```

See [docs/PROPOSALS.md](docs/PROPOSALS.md) for the full lifecycle. TUI uses `save-proposal --yes` and `proposal-list` after `plan`.

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) and [docs/MIGRATION.md](docs/MIGRATION.md).

## PCA Compatibility

`pca` remains a deprecated alias for one release:

```bash
node bin/pca.js scan --fixture test/fixtures/mixed-agent-project
```

Migration mapping:

| Before | After |
| --- | --- |
| `pca scan` | `metis scan` |
| `pca init --dry-run` | `metis init --dry-run` |
| `.pca/evidence/index.json` | `.metis/evidence/index.json` |
| `pca-<timestamp>` rollback ids | `metis-<timestamp>` rollback ids |

Metis reads legacy `.pca` evidence and rollback records when `.metis` artifacts are absent.

## Generated Artifacts

`init --dry-run` proposes diffs for:

- `CLAUDE.md`
- `AGENTS.md`
- `.cursor/rules/personal-agent.mdc`
- `.metis/evidence/index.json`

Generated sections use:

```text
<!-- METIS:BEGIN -->
<!-- METIS:END -->
```

Existing `<!-- PCA:BEGIN -->` sections are migrated to a single METIS managed section. Manual content outside markers is preserved.

## Evidence Sources

| Source | Handling |
| --- | --- |
| Claude Code | `CLAUDE.md`, `.claude/settings.json`, `.claude/mcp.json`, `.claude/hooks/**`, `.claude/skills/**` |
| Codex | root and nested `AGENTS.md`, `.codex/config.json`, `.codex/config.toml`, `.codex/sessions/**` inventory |
| Project | `package.json` scripts, `Makefile`, `README.md`, `docs/`, common lockfiles |

History content is not read by default. `--include-history` reads only bounded session snippets from the selected root, applies redaction first, and stores only redacted excerpts.

## Safety Boundary

- No accounts, cloud service, API key, or package install required.
- No remote calls or telemetry in core or first-release UI workflows.
- No hook or skill execution.
- No symlink traversal.
- No raw secret display.
- No silent transcript reading.
- TUI apply requires typing `APPLY METIS` after audit passes.
- GUI preview is read-only; no apply/rollback mutation controls.
- `init --apply --yes` writes only whitelisted scaffold paths and creates rollback metadata first.
- High-risk evidence blocks generation/apply.

## Non-Goals

- No chat runtime or cloud sync.
- No model gateway or remote backend.
- No automatic self-evolution or silent writes.
- No GUI apply button in the first release.

## Development

```bash
npm run check
npm run smoke:install
npm run qa:product
npm test
node --check bin/metis.js
node --check bin/pca.js
find lib -name '*.js' -print -exec node --check {} \;
find test -name '*.js' -print -exec node --check {} \;
```

TUI scripted QA:

```bash
node bin/metis.js tui --fixture test/fixtures/mixed-agent-project --script test/fixtures/tui/dry-run.txt
```

GUI preview QA:

```bash
node bin/metis.js gui --preview --fixture test/fixtures/mixed-agent-project --out /tmp/metis-preview.html
```

## License

MIT License. See `LICENSE`.
