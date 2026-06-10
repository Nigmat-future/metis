# Security Policy

Metis handles local coding-agent instructions, config metadata, and optional redacted history snippets. Treat all reports and fixtures as sensitive unless sanitized.

## Reporting

Do not include real secrets, private transcripts, proprietary prompts, customer code, or sensitive local paths in public reports. Use sanitized fixtures and include:

- source type involved
- command and flags used
- whether unredacted content could be displayed or persisted
- whether generated config could change agent behavior
- reproduction steps using fake canaries only

## MVP Security Boundary

- Core and first-release TUI/GUI workflows make no remote calls and send no telemetry.
- `scan`, `plan`, `init --dry-run`, `evolve --dry-run`, and `gui --preview` do not write target scaffold files.
- `gui --preview` writes only an explicit static HTML file; it does not start a localhost server.
- Session content is not read unless `--include-history` is set.
- History reads are bounded and redacted before evidence is built.
- Hooks and skills are counted but never executed.
- Symlink roots are rejected and symlinked files/directories are skipped.
- Normal output masks secret-like keys/values, private paths, private hosts, high-entropy strings, and prompt-injection markers.
- TUI and GUI outputs are subject to the same redaction boundary; UI canary regression tests cover transcripts and HTML.
- Safety audit blocks high-risk evidence before scaffold generation/apply.
- TUI apply requires explicit `APPLY METIS` confirmation after audit passes.
- GUI first release is read-only; no apply/rollback mutation controls.
- Apply writes only whitelisted paths and creates rollback metadata before scaffold writes.

## Sensitive Metadata

Absolute paths, JSON keys, MCP server names, hook filenames, command strings, prompts, and transcript snippets can all reveal private information. Tests use fake canaries such as `sk-pca-fake-secret`, private home path examples, and private host examples to prevent leakage.

## Out Of Scope

Metis is not a malware scanner, compliance product, or guarantee that inferred rules are correct. Report issues where Metis exposes, persists, executes, uploads, or silently applies sensitive data contrary to the boundary above.
