# Contributing

Thanks for helping with Metis.

## Development Rules

- Use Node.js 18 or newer.
- Keep runtime dependency-free and CommonJS.
- Keep source files small and cohesive.
- Run `npm test` before proposing changes.
- Do not add remote-call modules, telemetry, hosted processing, or implicit writes to core flows.
- First-release TUI and GUI must use Node stdlib only.

## Fixture Discipline

- Put deterministic fixtures under `test/fixtures/`.
- Put scripted TUI inputs under `test/fixtures/tui/`.
- Do not mutate fixture directories directly in tests; copy them to temp roots before write/apply/rollback checks.
- Use only fake canaries for secrets, private hosts, private paths, and prompt-injection markers.
- Add malformed, oversized, symlink, sensitive, and history fixtures when adapter behavior touches those cases.

## Adapter Rules

Adapters must:

- stay inside the selected root
- avoid symlink traversal
- avoid hook/skill execution
- display metadata or redacted excerpts only
- report unsupported or malformed sources explicitly
- attach evidence ids, signals, risks, and targets for planner use

## Verification

Run:

```bash
npm run check
npm run smoke:install
npm run qa:product
npm run evidence:release
```

`npm run check` runs portable syntax, LOC, no-network, doc consistency, tests, and package allowlist checks. Release maintainers also run install smoke, product QA, and release evidence generation. See `docs/PRODUCT-GRADE.md` and `docs/RELEASE.md`.

TUI scripted QA:

```bash
node bin/metis.js tui --fixture test/fixtures/mixed-agent-project --script test/fixtures/tui/dry-run.txt
node bin/metis.js tui --fixture test/fixtures/mixed-agent-project --script test/fixtures/tui/cancel-apply.txt
```

GUI preview QA:

```bash
node bin/metis.js gui --preview --fixture test/fixtures/mixed-agent-project --out /tmp/metis-preview.html
```

When adding scanner, generator, TUI, or GUI behavior, include tests proving no raw fake canary appears in stdout, stderr, evidence JSON, transcripts, HTML, or generated scaffold files.
