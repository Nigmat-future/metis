# Troubleshooting

## No evidence found

Run `metis doctor --fixture <root>` then `metis scan --fixture <root>`. Ensure the root contains supported Claude Code, Codex, or project files (`CLAUDE.md`, `AGENTS.md`, `package.json`, etc.).

## Audit blocked apply

Review `metis plan` and safety audit output. High-risk evidence (broad MCP permissions, prompt injection markers, dangerous scripts) blocks generation and apply. Fix or remove the risky source material, then rescan.

## Apply confirmation mismatch (TUI)

TUI writes require typing exactly `APPLY METIS` after `preview-diff`. Use `cancel-apply` to return to the diff view.

## Rollback not found

List rollback ids from `.metis/rollback/` or the GUI rollback ledger. Legacy ids under `.pca/rollback/` remain supported.

## Proposal lock held

Only one Metis artifact write runs at a time. Wait for the current operation to finish or remove a stale `.metis/.lock` file only if no Metis process is running.

## Missing proposal id

Run `metis proposal list --fixture <root>`. Inspect with `metis proposal inspect <id> --fixture <root>`.

## Package install smoke failure

Run `npm run smoke:install` from the repository root. Ensure `npm pack` includes `bin/metis.js` and no `.omo/evidence` paths.

## GUI export empty

Open the generated HTML in a modern browser. Export and copy buttons require browser clipboard/download APIs; exports are redacted JSON only and never write into the project tree.

## Windows path issues

Prefer forward slashes in `--fixture` and `--out` arguments. Use `node bin/metis.js` when shell shims are unavailable.
