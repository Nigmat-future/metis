# Mixed Claude Fixture

Run npm test before final answers.

<!-- METIS:BEGIN -->
# Metis Managed Personal Agent Rules

## Active Rules
- Respond in Simplified Chinese when project instructions require it. (Evidence: ev_000006)
- Prefer `node --check index.js` before reporting completion. (Evidence: ev_000011, ev_000012)
- Prefer `npm test` before reporting completion. (Evidence: ev_000013)

## Review Notes
- [needs-review] Keep agent scaffolds local and redacted (Evidence: ev_000006)
- [needs-review] Preserve existing Claude Code project instructions (Evidence: ev_000002)
- [needs-review] Respect AGENTS.md hierarchy and precedence (Evidence: ev_000006)
- [needs-review] Review hook workflows before generating rules (Evidence: ev_000001)
- [needs-review] Review MCP metadata before enabling tools (Evidence: ev_000003)
- [needs-review] Run the project build command for release-like changes (Evidence: ev_000011)
- [needs-review] Run the project lint command during review (Evidence: ev_000012)
<!-- METIS:END -->
