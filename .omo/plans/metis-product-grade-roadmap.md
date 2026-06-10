# Metis Product-Grade Roadmap

## TL;DR
> **Summary**: Move Metis from a strong local-first MVP into a product-grade tool that a real user can install, understand, trust, operate daily, and upgrade safely.
> **Deliverables**:
> - product-grade onboarding and install flow
> - maintainable Workbench TUI v3 with preserved zero-dependency runtime
> - read-only GUI preview upgraded into a useful review dashboard
> - persisted evolve proposal and evidence review workflow
> - release packaging, CI, evidence index, changelog, migration guide, and support docs
> - stronger end-to-end QA, security, and release gates
> **Effort**: XL
> **Parallel**: YES - 5 waves
> **Critical Path**: Task 1 -> Tasks 2/3/7/10 -> Tasks 4/8/11 -> Task 12 -> Task 15 -> Task 16 -> Final Verification

## Context

### Original Request

User asked to plan all next steps and ultimately make Metis a product-grade tool users can use.

### Interview Summary

- Current product direction: terminal-first, local-first, trust-preserving scaffold manager.
- Current implementation already has a usable CLI/TUI/GUI MVP, `.metis` artifacts, `.pca` compatibility, Workbench Shell v2 TUI, read-only static GUI preview, and a broad node:test suite.
- Product-grade means not only "features work", but also installability, first-run clarity, daily-use ergonomics, safe apply/rollback, reliable release artifacts, migration support, and evidence-backed QA.
- Defaults applied because they are already established in project docs: keep zero runtime dependencies, keep no telemetry/no remote calls, keep GUI read-only in this product-grade release, keep `pca` compatibility until a future documented migration/removal plan changes it.

### Metis Review (gaps addressed)

- Verification is fully agent-executed. User sign-off is treated only as a delivery communication step, not as a QA gate.
- Onboarding is defined as `metis --help`, `metis doctor`, README quick start, and first TUI welcome/diagnostic state all agreeing on the same read-only first action: run `scan` before any write.
- TUI v3 polish must first decompose `lib/tui/index.js` so new command history, Tab completion, palette/error states, and proposal review do not push the runtime past the 250 pure LOC warning band.
- Command history and Tab completion apply to interactive TTY raw mode and must also be testable through deterministic scripted TUI transcripts.
- GUI search/filter/detail/export remains static and read-only: inline zero-dependency browser JavaScript is allowed, remote imports are forbidden, project-file writes are forbidden, and export is limited to user-triggered redacted JSON/text download or copy content inside the browser.
- Evolve persistence is explicit only: `evolve --dry-run` stays read-only; proposal files are written only by an explicit save/confirm flow; proposal accept/apply must reuse existing audit, generation, rollback, and `APPLY METIS` gates.
- Release evidence index schema is fixed in Task 1: command, status, exit code, stdout/stderr artifact paths, related artifacts, SHA-256 hash, timestamp, duration, platform, Node version, and redaction status.
- `pca` compatibility remains in this release. This plan documents migration guidance only and does not remove the alias or legacy `.pca` reads.
- Concurrent/partial writes are addressed through an explicit local artifact transaction and lock task before proposal persistence is used by CLI/TUI.

## Work Objectives

### Core Objective

Make Metis feel and behave like a product-grade local developer tool: easy to try, safe to trust, smooth to operate, well documented, release-ready, and resilient under real project variance.

### Deliverables

- Release-ready package metadata and install smoke path.
- Product-grade command help, first-run onboarding, and project diagnostics.
- TUI v3 refactor and polish while preserving zero runtime dependencies.
- GUI preview upgraded into a read-only review dashboard with search/filter/detail/export.
- Evolve workflow upgraded from one-off dry-run into persisted reviewable proposals.
- Evidence index tying release gates to commands and artifacts.
- CI/release checklist, changelog, migration guide, troubleshooting guide, and support templates.
- Expanded fixtures and end-to-end QA matrix for real-user scenarios.

### Definition of Done (verifiable conditions with commands)

- `npm test` passes.
- `npm run check` passes and includes syntax checks for bin/lib/test.
- `npm pack --dry-run` or equivalent package-content check proves publishable files are correct.
- Installed/packed smoke can run `metis --help`, `metis scan`, `metis tui --script`, and `metis gui --preview` from a clean temp project.
- TUI runs at 80/100/140 columns with no broken critical layout and supports command history, Tab completion, apply confirmation, rollback, evolve proposal review, and clear error recovery.
- GUI preview contains overview, evidence, candidates, audit, diff, rollback ledger, evolve proposal, search/filter/detail controls, and no mutation controls.
- Evolve proposals are persisted under `.metis/proposals/` only through explicit save/confirm commands and can be listed, inspected, accepted into dry-run/apply flow, or dismissed without silent writes.
- No unredacted fake secret/private path/prompt-injection canary appears in stdout, stderr, evidence JSON, TUI transcripts, GUI HTML, generated scaffold files, or release evidence. Security docs may mention fake canaries only as clearly labeled sanitized examples.
- Static source search confirms no remote-call modules, no telemetry, and no localhost server in first product-grade GUI release.
- `.omo/evidence/release-product-grade-index.json` maps every final verification command to artifacts and pass/fail status.

### Must Have

- Local-first operation.
- Zero runtime dependencies.
- No telemetry, remote backend, cloud sync, hosted memory, LLM calls, or silent transcript reads.
- No silent writes.
- No raw secret display.
- No symlink/junction traversal.
- GUI remains read-only.
- TUI apply requires exact `APPLY METIS` after audit passes.
- Apply writes rollback metadata before scaffold writes.
- Existing `pca` compatibility remains until a documented migration/removal plan is executed.
- All product surfaces reuse `lib/workflows/index.js` and `lib/ui/view-model.js` instead of duplicating business logic.

### Must NOT Have

- No chat runtime.
- No model gateway.
- No GUI apply/rollback mutation controls in this plan.
- No localhost GUI server in this plan.
- No dependency on Ink, Blessed, React, Playwright runtime, or other TUI/GUI runtime packages.
- No automatic permission broadening.
- No automatic self-evolution apply.
- No unreviewed generated source outside whitelisted scaffold/artifact paths.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.

- Test decision: TDD for new behavior, tests-after only for documentation smoke and release evidence wiring where behavior already exists; framework remains Node `node:test`.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.omo/evidence/task-{N}-*`.
- Manual QA surfaces:
  - TUI: scripted stdin plus PTY smoke with captured transcript.
  - GUI: generated static HTML plus DOM assertions and Browser/Chrome screenshots. If the Browser tool cannot open the target in the environment, record an explicit DOM-only fallback artifact with the reason.
  - Packaging: `npm pack --dry-run`, local package install smoke in OS temp directory.
  - Release: generated evidence index with command outputs and artifact paths.

## Execution Strategy

### Parallel Execution Waves

Wave 1: Product baseline spec, portable check/release scripts, and TUI runtime decomposition.
Wave 2: TUI v3 UX, GUI dashboard IA, artifact/proposal persistence foundation, and onboarding/help/doctor.
Wave 3: GUI search/filter/export, evolve CLI proposal workflow, docs/migration/troubleshooting, and security hardening.
Wave 4: TUI proposal review, clean install smoke, expanded end-to-end QA matrix, and release evidence index.
Wave 5: Final verification and scope fidelity.

### Dependency Matrix (full, all tasks)

- Task 1 blocks Tasks 2, 5, 7, 10, 13, 15.
- Task 2 blocks Tasks 11, 12, 14, 16.
- Task 3 blocks Tasks 4, 9, 12.
- Task 4 blocks Tasks 9, 12, 15.
- Task 5 blocks Tasks 6, 15.
- Task 6 blocks Tasks 12, 15.
- Task 7 blocks Tasks 8, 9, 14, 15.
- Task 8 blocks Tasks 9, 12, 15.
- Task 9 blocks Tasks 12, 15.
- Task 10 blocks Tasks 11, 13, 15.
- Task 11 blocks Tasks 12, 15, 16.
- Task 12 blocks Tasks 15, 16.
- Task 13 blocks Tasks 14, 15, 16.
- Task 14 blocks Tasks 15, 16.
- Task 15 blocks Task 16 and Final Verification.
- Task 16 blocks Final Verification.

## TODOs

- [ ] 1. Product-grade baseline spec and schemas

  **What to do**: Create a product-grade baseline document and machine-readable schema notes that lock release scope before implementation. Define supported commands, read/write behavior, proposal schema, release evidence index schema, exit-code policy, stdout/stderr policy, cross-platform command policy, GUI export policy, and canary rules. Update PRD/architecture language only where it removes ambiguity.
  **Must NOT do**: Do not add implementation logic, remove `pca`, add hosted services, add telemetry, or authorize GUI mutation controls.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 2, 5, 7, 10, 13, 15 | Blocked By: none

  **References**:
  - Pattern: `docs/PRD.md:5` - product promise: local-first, no runtime dependency, no telemetry.
  - Pattern: `docs/PRD.md:13` - current command scope and first-release boundaries.
  - Pattern: `docs/ARCHITECTURE.md:28` - command write/no-write behavior.
  - Pattern: `SECURITY.md:17` - security boundary for no remote calls, no telemetry, explicit apply, GUI read-only.
  - Pattern: `README.md:32` - current user-facing command table.
  - Target new file: `docs/PRODUCT-GRADE.md` - baseline checklist and schema definitions.

  **Acceptance Criteria**:
  - [ ] `docs/PRODUCT-GRADE.md` defines exact product-grade scope, non-goals, command behavior, proposal schema, release evidence schema, exit codes, and GUI export policy.
  - [ ] `docs/PRD.md`, `docs/ARCHITECTURE.md`, `README.md`, and `SECURITY.md` do not contradict `docs/PRODUCT-GRADE.md`.
  - [ ] A test or doc-check command proves there are no unresolved decision markers, pending markers, or contradictory GUI/apply claims in product docs.
  - [ ] The schema defines `.metis/proposals/<id>.json` with `schemaVersion`, `id`, `status`, `createdAt`, `baselineEvidenceHash`, `changes`, `audit`, `redactionStatus`, and max serialized size.
  - [ ] The release evidence schema defines `command`, `status`, `exitCode`, `stdoutPath`, `stderrPath`, `artifacts`, `sha256`, `startedAt`, `durationMs`, `platform`, `nodeVersion`, and `redactionStatus`.

  **QA Scenarios**:
  ```text
  Scenario: Product baseline docs are internally consistent
    Tool: npm
    Steps: run the new doc consistency check after updating product docs
    Expected: command exits 0 and reports zero pending decisions or conflicting GUI/apply claims
    Evidence: .omo/evidence/task-1-product-baseline-doc-check.txt

  Scenario: Product baseline rejects forbidden scope drift
    Tool: node
    Steps: run the doc consistency check against a temp copy containing a fake "GUI apply button" claim
    Expected: command exits non-zero and reports the forbidden GUI mutation claim
    Evidence: .omo/evidence/task-1-product-baseline-forbidden-claim.txt
  ```

  **Commit**: YES | Message: `docs(product): define product-grade baseline` | Files: `docs/PRODUCT-GRADE.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `README.md`, `SECURITY.md`, doc-check tests/scripts

- [ ] 2. Portable package, check, and release script foundation

  **What to do**: Upgrade package metadata and add zero-dependency Node scripts for syntax checks, pure LOC checks, no-network/static forbidden import checks, package content inspection, and a single `npm run check` gate. Add `files`, `prepublishOnly`, and portable scripts that work on Windows, macOS, and Linux without shell-specific `find`, `cp`, or `mktemp`.
  **Must NOT do**: Do not add runtime dependencies, publish automatically, require Bash-only commands, or include `.omo/evidence`, fixtures not needed for runtime, local temp files, screenshots, or draft plans in the npm package.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 11, 12, 14, 16 | Blocked By: Task 1

  **References**:
  - Pattern: `package.json:2` - current package name/version/bin metadata.
  - Gap: `package.json:11` - current scripts only include `npm test`.
  - Pattern: `CONTRIBUTING.md:38` - existing syntax-check commands to replace with portable Node scripts.
  - Pattern: `test/pca-cli.test.js:162` - existing static no-remote-call regression pattern.
  - Target new files: `scripts/check-syntax.js`, `scripts/check-loc.js`, `scripts/check-no-network.js`, `scripts/check-package.js`.

  **Acceptance Criteria**:
  - [ ] `package.json` has `scripts.check`, `scripts.check:syntax`, `scripts.check:loc`, `scripts.check:no-network`, `scripts.check:package`, and `prepublishOnly`.
  - [ ] `package.json` has a `files` allowlist that includes `bin/`, `lib/`, `docs/`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, and excludes `.omo/`, `test/`, screenshots, and temp outputs.
  - [ ] `npm run check` runs `npm test` plus all static checks and exits 0.
  - [ ] `npm pack --dry-run` output is captured and contains `bin/metis.js`, `bin/pca.js`, `lib/workflows/index.js`, `README.md`, and excludes `.omo/evidence`.
  - [ ] All check scripts use only Node.js stdlib.

  **QA Scenarios**:
  ```text
  Scenario: Portable check gate passes
    Tool: npm
    Steps: npm run check
    Expected: exits 0, includes test summary, syntax summary, LOC summary, no-network summary, and package summary
    Evidence: .omo/evidence/task-2-product-check-pass.txt

  Scenario: Package allowlist blocks evidence leakage
    Tool: npm
    Steps: npm pack --dry-run and inspect listed files
    Expected: package includes runtime/docs files and excludes .omo/evidence, .omo/drafts, screenshots, and temp artifacts
    Evidence: .omo/evidence/task-2-product-pack-allowlist.txt
  ```

  **Commit**: YES | Message: `chore(release): add portable product checks` | Files: `package.json`, `scripts/*.js`, `CONTRIBUTING.md`, release/check tests

- [ ] 3. TUI runtime decomposition before v3 UX

  **What to do**: Split `lib/tui/index.js` into cohesive zero-dependency modules before adding more TUI behavior. Keep `index.js` as the public entry, move terminal/session IO into `lib/tui/session.js`, shell/input lifecycle into `lib/tui/shell.js`, history into `lib/tui/history.js`, completion into `lib/tui/completion.js`, and scripted transcript helpers into `lib/tui/script-runner.js`. Preserve existing state machine, renderer, command parser, and script fixtures.
  **Must NOT do**: Do not change user-visible TUI behavior in this task except for equivalent transcript output caused by refactor-safe whitespace. Do not add dependencies or duplicate workflow orchestration.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 4, 9, 12 | Blocked By: none

  **References**:
  - Pattern: `lib/tui/index.js:23` - current state machine construction and workflow injection.
  - Pattern: `lib/tui/index.js:227` - scan workflow entry point currently inside runtime.
  - Pattern: `lib/tui/state.js:16` - exact `APPLY METIS` confirmation constant to preserve.
  - Pattern: `lib/tui/renderer.js:27` - current Workbench renderer entry.
  - Pattern: `lib/tui/commands.js:15` - existing command suggestions and parser.
  - Pattern: `test/metis-tui.test.js:91` - current transcript expects `METIS WORKBENCH`.

  **Acceptance Criteria**:
  - [ ] `lib/tui/index.js` remains a thin entry under 120 pure LOC.
  - [ ] Every hand-authored `lib/tui/*.js` file is under 250 pure LOC.
  - [ ] Existing TUI tests and scripted fixture tests pass without weakening assertions.
  - [ ] No business pipeline logic is copied out of `lib/workflows/index.js`.
  - [ ] `node --check` passes for all new TUI files through `npm run check:syntax`.

  **QA Scenarios**:
  ```text
  Scenario: Refactor preserves dry-run transcript
    Tool: node
    Steps: node bin/metis.js tui --fixture test/fixtures/mixed-agent-project --script test/fixtures/tui/dry-run.txt
    Expected: exits 0 and transcript still includes METIS WORKBENCH, evidence count, candidates, and no raw canaries
    Evidence: .omo/evidence/task-3-tui-refactor-dry-run.txt

  Scenario: Refactor preserves cancelled apply safety
    Tool: node
    Steps: node bin/metis.js tui --fixture test/fixtures/mixed-agent-project --script test/fixtures/tui/cancel-apply.txt
    Expected: exits 0, does not create target scaffold writes, and shows apply cancelled state
    Evidence: .omo/evidence/task-3-tui-refactor-cancel-apply.txt
  ```

  **Commit**: YES | Message: `refactor(tui): split runtime shell modules` | Files: `lib/tui/index.js`, `lib/tui/session.js`, `lib/tui/shell.js`, `lib/tui/history.js`, `lib/tui/completion.js`, `lib/tui/script-runner.js`, `test/metis-tui.test.js`

- [ ] 4. TUI v3 command workbench polish

  **What to do**: Upgrade the TUI from Workbench Shell v2 to v3 with a polished command bar: stable `metis >` prompt, command history, Tab completion hints, mode-aware suggestions, status/error strip, keyboard-safe redraw, graceful narrow-width layout, and confirmation/error states that feel smooth without hiding safety gates. Keep the custom Metis palette, make 80/100/140 column transcripts readable, and add explicit handling for invalid commands and failed audits.
  **Must NOT do**: Do not add Ink/Blessed/React, do not introduce async remote work, do not bypass `APPLY METIS`, and do not turn TUI into a chat interface.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 9, 12, 15 | Blocked By: Task 3

  **References**:
  - Pattern: `lib/tui/renderer.js:69` - current step model: scan, plan, diff, apply, rollback, evolve.
  - Pattern: `lib/tui/renderer.js:157` - current apply confirmation prompt area.
  - Pattern: `lib/tui/commands.js:101` - command help text and suggestions.
  - Pattern: `lib/tui/state.js:56` - current evidence detail transition pattern.
  - Pattern: `test/fixtures/tui/happy.txt:3` - scripted exact `APPLY METIS` confirmation.
  - Evidence reference: `.omo/evidence/metis-tui-palette-mockup.png` - palette direction already reviewed.

  **Acceptance Criteria**:
  - [ ] Interactive TTY mode supports Up/Down history and Tab completion without corrupting redraw.
  - [ ] Scripted mode can assert completion/history/error state deterministically.
  - [ ] 80, 100, and 140 column transcripts show no clipped command prompt, broken table borders, or overlapping status text.
  - [ ] Invalid commands produce a concise error and retain the previous safe state.
  - [ ] Audit failure blocks apply and explains the blocking issue without exposing raw secrets.
  - [ ] TUI v3 still uses only Node.js stdlib and shared workflows.

  **QA Scenarios**:
  ```text
  Scenario: TUI v3 command bar happy path
    Tool: node
    Steps: run scripted TUI fixture covering scan, plan, diff, Tab completion, history recall, APPLY METIS, rollback, quit
    Expected: exits 0, shows metis > prompt states, creates rollback only after exact confirmation, and transcript has no raw canaries
    Evidence: .omo/evidence/task-4-tui-v3-happy.txt

  Scenario: TUI v3 invalid command and audit failure recovery
    Tool: node
    Steps: run scripted TUI fixture on sensitive metadata project with invalid command then attempted apply
    Expected: invalid command is recoverable, audit failure blocks apply, no scaffold writes happen, and redacted issue text appears
    Evidence: .omo/evidence/task-4-tui-v3-error.txt
  ```

  **Commit**: YES | Message: `feat(tui): polish command workbench v3` | Files: `lib/tui/*.js`, `test/metis-tui.test.js`, `test/fixtures/tui/*.txt`, `.omo/evidence/task-4-*`

- [ ] 5. GUI preview dashboard information architecture

  **What to do**: Redesign the static GUI preview into a product-grade read-only review dashboard. Add a clear information architecture for overview, evidence, behavior candidates, safety audit, diff preview, rollback ledger, and evolve proposal summary. Reuse `lib/ui/view-model.js` and keep all project data redacted before rendering. The dashboard should work as a static HTML file without localhost or network imports.
  **Must NOT do**: Do not add apply/rollback/write/mutate controls, do not start a server, do not duplicate scan/plan/audit logic in GUI code, and do not use external CSS/JS/CDN assets.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 6, 15 | Blocked By: Task 1

  **References**:
  - Pattern: `lib/gui/index.js:1` - GUI entry writes static preview only.
  - Pattern: `lib/gui/preview.js:36` - current read-only subheading and static HTML template.
  - Pattern: `lib/ui/view-model.js:4` - shared view model summary for TUI/GUI.
  - Pattern: `test/metis-gui.test.js:34` - current read-only HTML section test.
  - Guardrail: `README.md:44` - first GUI release has no localhost server and no apply/rollback controls.
  - Guardrail: `docs/PRD.md:23` - GUI is read-only static HTML preview.

  **Acceptance Criteria**:
  - [ ] GUI preview contains semantic sections for overview, evidence, candidates, audit, diff, rollback ledger, and evolve proposal summary.
  - [ ] Generated HTML has no remote imports, no form actions, and no mutation controls with apply/rollback/write/mutate semantics.
  - [ ] Layout is readable at desktop and narrow widths using static CSS only.
  - [ ] GUI data comes from `buildViewModel` or a shared read-only view model helper, not duplicated pipeline logic.
  - [ ] Sensitive fixture GUI output shows redacted values and audit issues only.

  **QA Scenarios**:
  ```text
  Scenario: GUI dashboard renders full read-only IA
    Tool: node
    Steps: node bin/metis.js gui --preview --fixture test/fixtures/mixed-agent-project --out .omo/evidence/task-5-gui-dashboard.html
    Expected: HTML contains overview, evidence, candidates, audit, diff, rollback, evolve sections and no mutation controls
    Evidence: .omo/evidence/task-5-gui-dashboard.html

  Scenario: GUI dashboard redacts sensitive project
    Tool: node
    Steps: generate GUI preview for test/fixtures/sensitive-metadata-project and inspect HTML text
    Expected: fake secret/private host/private path are absent, redacted placeholders and audit issue are present
    Evidence: .omo/evidence/task-5-gui-dashboard-sensitive.html
  ```

  **Commit**: YES | Message: `feat(gui): organize read-only review dashboard` | Files: `lib/gui/index.js`, `lib/gui/preview.js`, `lib/ui/view-model.js`, `test/metis-gui.test.js`, `.omo/evidence/task-5-*`

- [ ] 6. GUI read-only search, filter, detail, and export polish

  **What to do**: Add zero-dependency inline browser behavior to the static GUI preview for client-side search, type/risk/decision filters, detail expansion, keyboard-safe focus, print-friendly layout, and user-triggered export of the redacted dashboard snapshot as JSON/text. Embed all data safely after redaction and escaping. Export may download/copy redacted data in the browser, but it must never write into the project tree.
  **Must NOT do**: Do not add remote scripts, do not add local server behavior, do not create project files from the GUI, do not expose raw evidence, and do not add mutation controls.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Tasks 12, 15 | Blocked By: Task 5

  **References**:
  - Pattern: `lib/gui/preview.js:36` - static HTML surface to extend.
  - Pattern: `lib/core/display.js:2` - display-level redaction/sanitization helpers.
  - Pattern: `lib/core/evidence.js:19` - evidence builder redacts paths, summaries, excerpts, and details.
  - Pattern: `test/metis-gui.test.js:67` - existing assertion against mutation controls.
  - Guardrail: `SECURITY.md:25` - TUI and GUI outputs share redaction boundary.

  **Acceptance Criteria**:
  - [ ] Search narrows visible evidence/candidates by id, source, kind, risk, title, and target.
  - [ ] Filters can combine source, risk, decision, and redaction status without losing detail content.
  - [ ] Detail panels are expandable/collapsible and keyboard reachable.
  - [ ] Exported JSON/text includes only redacted dashboard data and contains schema/version metadata.
  - [ ] Static tests prove the HTML contains no external `script src`, no external `link href`, no form submit, and no mutation controls.
  - [ ] Browser screenshot or DOM fallback evidence covers desktop and narrow widths.

  **QA Scenarios**:
  ```text
  Scenario: GUI search/filter/detail/export works on static HTML
    Tool: Browser + node fallback
    Steps: open generated HTML, search for a known evidence id, filter by risk/decision, expand detail, trigger redacted export
    Expected: visible rows update, detail content is redacted, export payload has schema metadata, and no project files are created
    Evidence: .omo/evidence/task-6-gui-interaction-desktop.png

  Scenario: GUI blocks remote and mutation surface
    Tool: node
    Steps: parse generated HTML and search for external imports, form actions, data-action apply/rollback/write/mutate, raw canaries
    Expected: all forbidden patterns absent and redacted placeholders present where expected
    Evidence: .omo/evidence/task-6-gui-static-guardrails.txt
  ```

  **Commit**: YES | Message: `feat(gui): add read-only dashboard interactions` | Files: `lib/gui/preview.js`, `lib/ui/view-model.js`, `test/metis-gui.test.js`, `.omo/evidence/task-6-*`

- [ ] 7. Artifact transaction and proposal persistence foundation

  **What to do**: Add a shared local artifact store for `.metis` writes that supports explicit transaction boundaries, safe path allowlists, schema-versioned proposal files, local lock detection, max-size enforcement, atomic write-then-rename where supported, and no symlink/junction traversal. Use it for proposal persistence and prepare it for release evidence indexing. Preserve existing rollback behavior and `.pca` compatibility.
  **Must NOT do**: Do not make `evolve --dry-run` write files, do not silently overwrite proposals, do not store raw secrets, do not traverse symlinks/junctions, and do not change scaffold target writes in this task unless routed through safer shared helpers with identical behavior.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 8, 9, 14, 15 | Blocked By: Task 1

  **References**:
  - Pattern: `lib/core/artifacts.js:6` - `.metis/evidence` and rollback path constants.
  - Pattern: `lib/core/artifacts.js:28` - legacy `.pca` evidence compatibility.
  - Pattern: `lib/applier/apply.js` - existing rollback-before-write behavior to preserve.
  - Pattern: `lib/applier/rollback.js` - rollback record validation pattern to reuse.
  - Guardrail: `docs/ARCHITECTURE.md:55` - applier writes only whitelisted scaffold paths and Metis rollback metadata.
  - Target new files: `lib/core/artifact-store.js`, `lib/core/proposals.js`.

  **Acceptance Criteria**:
  - [ ] Proposal IDs follow `metis-proposal-<timestamp>` and files are written only under `.metis/proposals/`.
  - [ ] Proposal records match Task 1 schema, contain only redacted evidence/candidate data, and include `schemaVersion`.
  - [ ] Existing `.pca` evidence/rollback reads still pass compatibility tests.
  - [ ] Concurrent write attempts fail fast with a clear local lock error and no partial proposal file.
  - [ ] Oversized proposal records are rejected before write.
  - [ ] Symlink/junction proposal paths are rejected or skipped according to existing root-safety policy.

  **QA Scenarios**:
  ```text
  Scenario: Explicit proposal save writes redacted schema file
    Tool: node
    Steps: call the new proposal store helper on a temp fixture with redacted proposal data
    Expected: .metis/proposals/metis-proposal-*.json exists, matches schema, and contains no raw canaries
    Evidence: .omo/evidence/task-7-proposal-save-schema.json

  Scenario: Proposal store blocks lock and unsafe paths
    Tool: node
    Steps: create temp root with active lock or symlinked .metis/proposals path, then attempt proposal save
    Expected: exits/fails with clear error, writes no proposal, and leaves no partial temp file
    Evidence: .omo/evidence/task-7-proposal-store-guardrails.txt
  ```

  **Commit**: YES | Message: `feat(core): add safe proposal artifact store` | Files: `lib/core/artifacts.js`, `lib/core/artifact-store.js`, `lib/core/proposals.js`, `test/*.test.js`

- [ ] 8. Evolve proposal CLI review workflow

  **What to do**: Upgrade evolve from transient dry-run output into an explicit CLI proposal workflow. Keep `metis evolve --dry-run` read-only. Add explicit proposal save and review commands such as `metis evolve --save-proposal --yes`, `metis proposal list`, `metis proposal inspect <id>`, `metis proposal dismiss <id> --yes`, and `metis proposal accept <id> --dry-run|--apply --yes`. Proposal accept must reuse `scanWorkflow`, safety audit, generation, apply, and rollback semantics.
  **Must NOT do**: Do not make `evolve` write without explicit save intent, do not let proposal accept bypass audit, do not apply without `--apply --yes` in CLI, and do not remove legacy `.pca` evidence fallback.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Tasks 9, 12, 15 | Blocked By: Task 7

  **References**:
  - Pattern: `lib/planner/evolve.js` - current dry-run diff proposal logic.
  - Pattern: `lib/workflows/index.js:52` - `evolveWorkflow` entry point.
  - Pattern: `lib/cli/args.js:1` - command registry to extend with `proposal`.
  - Pattern: `lib/cli/commands.js:47` - current evolve command dispatch.
  - Pattern: `lib/cli/output.js:10` - CLI help command table.
  - Pattern: `test/behavior-contract.test.js:27` - evolve risk blocking tests.

  **Acceptance Criteria**:
  - [ ] `metis evolve --dry-run` remains read-only and existing tests prove no `.metis/proposals` write.
  - [ ] `metis evolve --save-proposal --yes` writes exactly one redacted proposal file and prints its id/path.
  - [ ] `metis proposal list` prints id, status, createdAt, change count, and audit status.
  - [ ] `metis proposal inspect <id>` prints redacted change details and baseline evidence hash.
  - [ ] `metis proposal dismiss <id> --yes` changes status to dismissed without touching scaffold targets.
  - [ ] `metis proposal accept <id> --dry-run` shows generated diff without writing scaffold targets.
  - [ ] `metis proposal accept <id> --apply --yes` writes rollback metadata before scaffold writes and is blocked by high-risk audit.

  **QA Scenarios**:
  ```text
  Scenario: CLI proposal lifecycle happy path
    Tool: node
    Steps: run evolve --save-proposal --yes, proposal list, inspect, accept --dry-run, accept --apply --yes, rollback on temp fixture
    Expected: proposal status transitions are correct, apply writes rollback first, rollback restores files, and no raw canaries appear
    Evidence: .omo/evidence/task-8-cli-proposal-lifecycle.txt

  Scenario: CLI proposal blocks unsafe or missing proposal
    Tool: node
    Steps: inspect a missing proposal id and accept a proposal generated from sensitive metadata project
    Expected: missing id exits with clear code/message; unsafe proposal is blocked by audit and writes no scaffold files
    Evidence: .omo/evidence/task-8-cli-proposal-error.txt
  ```

  **Commit**: YES | Message: `feat(evolve): add proposal review commands` | Files: `lib/planner/evolve.js`, `lib/workflows/index.js`, `lib/cli/args.js`, `lib/cli/commands.js`, `lib/cli/output.js`, `test/*.test.js`

- [ ] 9. TUI proposal review workflow

  **What to do**: Add proposal review to TUI v3 using the shared proposal workflow from Task 8. Users must be able to create a proposal explicitly, list proposals, inspect changes, dismiss proposals, dry-run accepted changes, and apply only after the existing exact `APPLY METIS` confirmation. The UI must distinguish proposal metadata writes from scaffold writes and show clear status/error recovery.
  **Must NOT do**: Do not auto-save proposals during ordinary scan/plan/evolve views, do not apply accepted proposals without `APPLY METIS`, do not duplicate CLI proposal logic, and do not show raw proposal contents.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: Tasks 12, 15 | Blocked By: Tasks 3, 4, 7, 8

  **References**:
  - Pattern: `lib/tui/state.js:129` - current apply success context and rollback id handling.
  - Pattern: `lib/tui/state.js:136` - current rollback event pattern.
  - Pattern: `lib/tui/commands.js:15` - state-specific command suggestion model.
  - Pattern: `lib/tui/renderer.js:84` - current result panel rendering.
  - Pattern: `lib/workflows/index.js:52` - evolve workflow hook to extend through shared proposal functions.
  - Guardrail: `SECURITY.md:27` - TUI apply requires exact `APPLY METIS`.

  **Acceptance Criteria**:
  - [ ] TUI suggestions include proposal commands only in valid states.
  - [ ] `save-proposal` or equivalent TUI command asks for explicit confirmation before writing `.metis/proposals`.
  - [ ] Proposal inspect view shows id, status, audit status, change count, baseline hash, and redacted changes.
  - [ ] Proposal dismiss writes only proposal status and no scaffold targets.
  - [ ] Proposal accept dry-run shows diff without writes.
  - [ ] Proposal accept apply requires exact `APPLY METIS` and uses rollback metadata.
  - [ ] All proposal TUI transcripts are free of raw canaries.

  **QA Scenarios**:
  ```text
  Scenario: TUI proposal review happy path
    Tool: node
    Steps: run scripted TUI fixture covering evolve, save-proposal confirmation, list, inspect, accept dry-run, APPLY METIS, rollback
    Expected: proposal file is explicit, scaffold writes happen only after APPLY METIS, rollback restores files
    Evidence: .omo/evidence/task-9-tui-proposal-happy.txt

  Scenario: TUI proposal unsafe and dismissed paths
    Tool: node
    Steps: run scripted TUI fixture on sensitive project, inspect blocked proposal, dismiss it, attempt apply
    Expected: audit blocks apply, dismiss changes status only, no scaffold writes, no raw canaries
    Evidence: .omo/evidence/task-9-tui-proposal-error.txt
  ```

  **Commit**: YES | Message: `feat(tui): add proposal review workflow` | Files: `lib/tui/*.js`, `test/metis-tui.test.js`, `test/fixtures/tui/*.txt`

- [ ] 10. Onboarding, help, and first-run diagnostics

  **What to do**: Add product-grade onboarding across CLI help, README quick start, TUI welcome state, and a read-only `metis doctor` command. `doctor` should report Node version, package version, root resolution, evidence support, write capability summary, no-telemetry/no-remote promise, `.metis`/legacy `.pca` artifact status, and the safest next command. It must never write files or read history unless `--include-history` is explicitly provided and supported by existing scan behavior.
  **Must NOT do**: Do not collect telemetry, do not phone home for updates, do not create config files, do not read private transcripts by default, and do not recommend `--apply --yes` as the first action.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 11, 13, 15 | Blocked By: Task 1

  **References**:
  - Pattern: `lib/cli/output.js:10` - current help command descriptions.
  - Pattern: `lib/cli/output.js:25` - current local-first help promise.
  - Pattern: `bin/metis.js` - main entry and help path.
  - Pattern: `README.md:12` - current quick verification commands.
  - Pattern: `README.md:97` - history is opt-in and redacted.
  - Pattern: `docs/PRD.md:44` - terminal-first user story.

  **Acceptance Criteria**:
  - [ ] `metis --help` and `pca --help` list `doctor`; `pca` still shows deprecation notice.
  - [ ] `metis doctor --fixture test/fixtures/mixed-agent-project` exits 0, writes nothing, and recommends `metis scan` or `metis tui` as safe next action.
  - [ ] `doctor` reports no remote calls, no telemetry, GUI read-only, TUI apply confirmation, `.metis` artifact state, and legacy `.pca` status.
  - [ ] TUI initial/welcome state gives a concise diagnostic summary and command hints without visible tutorial prose walls.
  - [ ] README quick start and troubleshooting link use the same first-run flow.

  **QA Scenarios**:
  ```text
  Scenario: Doctor guides a fresh user without writes
    Tool: node
    Steps: node bin/metis.js doctor --fixture test/fixtures/mixed-agent-project and inspect temp root before/after
    Expected: exits 0, prints version/root/safety/next action, and creates no .metis or scaffold files
    Evidence: .omo/evidence/task-10-doctor-fresh-user.txt

  Scenario: Doctor handles unsupported or sensitive root
    Tool: node
    Steps: run doctor on empty temp root and sensitive metadata fixture
    Expected: empty root reports no evidence with next steps; sensitive root output is redacted and no history is read by default
    Evidence: .omo/evidence/task-10-doctor-edge-cases.txt
  ```

  **Commit**: YES | Message: `feat(cli): add first-run doctor` | Files: `bin/metis.js`, `bin/pca.js`, `lib/cli/args.js`, `lib/cli/commands.js`, `lib/cli/output.js`, `lib/tui/*.js`, `README.md`, tests

- [ ] 11. Clean install and packed artifact smoke

  **What to do**: Add a zero-dependency install smoke that packs Metis, installs it into a clean temp project, and verifies the published bin commands from the installed package rather than the workspace source path. The smoke must cover `metis --help`, `pca --help`, `metis doctor`, `metis scan`, `metis tui --script`, `metis gui --preview`, `metis evolve --dry-run`, proposal save/list/inspect where available, and package uninstall/cleanup.
  **Must NOT do**: Do not depend on global npm state, do not leave temp directories behind, do not require network install, and do not use shell-specific copy/temp commands.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: Tasks 12, 15, 16 | Blocked By: Tasks 2, 10

  **References**:
  - Pattern: `package.json:7` - `metis` and `pca` bin mapping.
  - Pattern: `README.md:12` - existing quick commands to smoke after install.
  - Pattern: `README.md:47` - GUI preview command.
  - Pattern: `test/helpers/fixtures.js:10` - temp fixture helper style.
  - Target new file: `scripts/install-smoke.js`.

  **Acceptance Criteria**:
  - [ ] `npm run smoke:install` creates an isolated temp directory, runs `npm pack`, installs from the local tarball, and uses installed `metis`/`pca` bins.
  - [ ] Smoke covers help, doctor, scan, TUI scripted dry-run, GUI preview, evolve dry-run, and proposal read/list behavior when proposal tasks are present.
  - [ ] Smoke proves `.omo/evidence` is not included in package tarball.
  - [ ] Smoke removes temp directories on success and failure.
  - [ ] Smoke writes command output artifacts under `.omo/evidence/task-11-*`.

  **QA Scenarios**:
  ```text
  Scenario: Packed install works from clean temp project
    Tool: npm
    Steps: npm run smoke:install
    Expected: exits 0, installed metis and pca bins work, GUI preview file is generated in temp output, and temp root is cleaned
    Evidence: .omo/evidence/task-11-install-smoke-pass.txt

  Scenario: Packed install smoke reports package-content failure
    Tool: node
    Steps: run install smoke with a test flag or temp package manifest that omits bin/metis.js
    Expected: smoke exits non-zero with clear package-content error and cleanup still runs
    Evidence: .omo/evidence/task-11-install-smoke-failure.txt
  ```

  **Commit**: YES | Message: `test(release): add packed install smoke` | Files: `package.json`, `scripts/install-smoke.js`, `test/*.test.js`, `.omo/evidence/task-11-*`

- [ ] 12. Expanded end-to-end product QA matrix

  **What to do**: Create a product QA runner that executes the real user journeys across clean temp fixtures: scan -> plan -> dry-run -> apply -> rollback; TUI v3 at 80/100/140 columns; GUI static dashboard at desktop/narrow layout; evolve proposal lifecycle; sensitive fixture redaction; symlink/junction root rejection; empty project diagnostics; and legacy `.pca` compatibility. Store transcripts and summaries under a task-specific evidence prefix.
  **Must NOT do**: Do not weaken existing unit tests, do not rely on manual clicking as the only evidence, do not use real user secrets or paths, and do not let QA mutate the developer workspace outside temp roots and `.omo/evidence/task-12-*`.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: Tasks 15, 16 | Blocked By: Tasks 2, 3, 4, 6, 8, 9, 11

  **References**:
  - Pattern: `test/metis-cli.test.js:58` - apply writes Metis artifacts and rollback restores prior state.
  - Pattern: `test/metis-tui.test.js:149` - TUI frame/transcript assertions.
  - Pattern: `test/metis-gui.test.js:34` - GUI preview read-only assertions.
  - Pattern: `test/security-regressions.test.js:38` - malformed rollback safety.
  - Pattern: `test/metis-compat.test.js:32` - legacy `.pca` evidence compatibility.
  - Target new file: `scripts/product-qa.js`.

  **Acceptance Criteria**:
  - [ ] `npm run qa:product` runs the full matrix and exits 0.
  - [ ] QA captures per-scenario stdout/stderr/transcript/HTML/screenshot-or-DOM fallback artifacts under `.omo/evidence/task-12-*`.
  - [ ] Apply/rollback scenario restores temp fixture byte-for-byte for managed files and preserves manual content outside markers.
  - [ ] Sensitive canaries are absent from every runtime artifact except allowed labeled security-doc examples.
  - [ ] TUI width scenarios show no overlapping command/status text.
  - [ ] GUI scenarios confirm no mutation controls and no remote imports.

  **QA Scenarios**:
  ```text
  Scenario: Full product QA matrix passes
    Tool: npm
    Steps: npm run qa:product
    Expected: exits 0 and writes matrix summary with pass status for CLI, TUI, GUI, evolve, security, compatibility, and install smoke
    Evidence: .omo/evidence/task-12-product-qa-summary.json

  Scenario: Product QA catches redaction regression
    Tool: node
    Steps: run QA redaction subtest against a temp output containing sk-pca-fake-secret
    Expected: subtest exits non-zero and reports the artifact path that leaked the canary
    Evidence: .omo/evidence/task-12-product-qa-redaction-failure.txt
  ```

  **Commit**: YES | Message: `test(product): add end-to-end QA matrix` | Files: `package.json`, `scripts/product-qa.js`, `test/*.test.js`, `test/fixtures/**`, `.omo/evidence/task-12-*`

- [ ] 13. Documentation set: migration, troubleshooting, release checklist, and changelog

  **What to do**: Complete the user-facing and maintainer-facing documentation set. Add `CHANGELOG.md`, `docs/MIGRATION.md`, `docs/TROUBLESHOOTING.md`, `docs/RELEASE.md`, and `docs/PROPOSALS.md`. Update README with install/quick-start/doctor/TUI/GUI/proposal sections. Document `pca` alias compatibility as retained for this release only, without removing it. Include clear support/reporting guidance that avoids sharing secrets.
  **Must NOT do**: Do not promise cloud sync, hosted accounts, GUI apply, automatic self-evolution, or future removal dates not implemented in this plan. Do not include real secrets, real user paths, or proprietary prompts in examples.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Tasks 14, 15, 16 | Blocked By: Tasks 1, 10

  **References**:
  - Pattern: `README.md:5` - current product positioning.
  - Pattern: `README.md:54` - current `pca` alias migration note.
  - Pattern: `README.md:102` - current safety promises.
  - Pattern: `SECURITY.md:7` - report guidance for sensitive content.
  - Pattern: `CONTRIBUTING.md:38` - existing developer verification command list.
  - Pattern: `docs/ARCHITECTURE.md:40` - `.metis` artifact paths.

  **Acceptance Criteria**:
  - [ ] README includes install, quick start, doctor, TUI, GUI preview, proposal lifecycle, apply/rollback, safety, and troubleshooting links.
  - [ ] `docs/MIGRATION.md` maps `pca` -> `metis`, `.pca` -> `.metis`, rollback id behavior, and marker migration.
  - [ ] `docs/TROUBLESHOOTING.md` covers no evidence found, audit blocked, apply confirmation mismatch, rollback not found, proposal lock, package install, GUI export, and Windows path issues.
  - [ ] `docs/RELEASE.md` describes release checklist, evidence index, npm pack, install smoke, CI, changelog, and rollback plan.
  - [ ] `docs/PROPOSALS.md` documents proposal schema, lifecycle, explicit save/apply behavior, and redaction expectations.
  - [ ] `CHANGELOG.md` includes an unreleased product-grade entry.
  - [ ] Doc consistency check from Task 1 passes.

  **QA Scenarios**:
  ```text
  Scenario: Product docs match implemented commands and scope
    Tool: npm
    Steps: npm run check:docs or the Task 1 doc consistency script
    Expected: exits 0 and confirms no missing command docs, no forbidden GUI/apply promises, and no pending decisions
    Evidence: .omo/evidence/task-13-docs-consistency.txt

  Scenario: Docs canary and migration guardrails
    Tool: node
    Steps: scan docs for raw fake secrets/private paths outside labeled security examples and verify pca compatibility text remains
    Expected: only allowed sanitized examples are found; docs state pca remains compatible in this release
    Evidence: .omo/evidence/task-13-docs-security-migration.txt
  ```

  **Commit**: YES | Message: `docs(product): add release and migration docs` | Files: `README.md`, `CHANGELOG.md`, `docs/MIGRATION.md`, `docs/TROUBLESHOOTING.md`, `docs/RELEASE.md`, `docs/PROPOSALS.md`, `CONTRIBUTING.md`, `SECURITY.md`

- [ ] 14. Security, privacy, and failure-mode hardening

  **What to do**: Harden product-grade safety across new proposal, GUI export, doctor, release evidence, package, and QA surfaces. Add tests for no auth/accounts/tokens, no telemetry/remote calls, no raw secrets/private paths/prompt injection in runtime artifacts, proposal max-size and lock errors, partial write cleanup, malformed proposal records, JSON error shape, and consistent stdout/stderr/exit codes. Keep fake canary examples allowed only in labeled security docs.
  **Must NOT do**: Do not add network clients, update checkers, account/token storage, analytics, or permission prompts that broaden access. Do not remove existing security tests.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Tasks 15, 16 | Blocked By: Tasks 2, 7, 13

  **References**:
  - Pattern: `lib/core/redactor.js:15` - central text redaction.
  - Pattern: `lib/core/evidence.js:19` - evidence field redaction pipeline.
  - Pattern: `lib/auditor/safety.js:3` - safety audit entry.
  - Pattern: `test/security-regressions.test.js:38` - malformed rollback validates before writing.
  - Pattern: `test/security-regressions.test.js:83` - dangerous remote pipe blocks generation.
  - Guardrail: `SECURITY.md:17` - no remote calls and no telemetry.

  **Acceptance Criteria**:
  - [ ] Static no-network check covers `http`, `https`, `fetch`, `XMLHttpRequest`, `net`, `tls`, child remote pipe patterns, telemetry terms, and external GUI imports with allowlisted documentation references only.
  - [ ] Runtime canary matrix scans stdout, stderr, JSON, proposal files, release evidence, TUI transcripts, GUI HTML/export payloads, and generated scaffold files.
  - [ ] Malformed proposal, oversized proposal, lock collision, and partial write failure tests leave no target scaffold changes.
  - [ ] CLI JSON error output, human stderr output, and exit codes are consistent for missing proposal, blocked audit, bad args, and package smoke failure.
  - [ ] Symlink/junction traversal tests cover `.metis/proposals`, release evidence output, and GUI output paths in addition to existing roots.
  - [ ] `npm run check:no-network` and `npm test` pass.

  **QA Scenarios**:
  ```text
  Scenario: Runtime artifacts contain no raw sensitive canaries
    Tool: npm
    Steps: npm run qa:product then run the canary matrix over all task artifacts and temp outputs
    Expected: no raw fake secret/private host/private path/prompt injection markers outside allowed security-doc examples
    Evidence: .omo/evidence/task-14-security-canary-matrix.txt

  Scenario: Proposal and release evidence writes fail safely
    Tool: node
    Steps: trigger malformed proposal, oversized proposal, lock collision, and unsafe output path cases
    Expected: clear exit codes/messages, no partial files, no scaffold writes, and no raw data in errors
    Evidence: .omo/evidence/task-14-failure-mode-hardening.txt
  ```

  **Commit**: YES | Message: `test(security): harden product safety gates` | Files: `lib/core/*.js`, `lib/cli/*.js`, `lib/gui/*.js`, `lib/tui/*.js`, `scripts/*.js`, `test/*.test.js`

- [ ] 15. Release evidence index generator and final artifact pack

  **What to do**: Implement a release evidence generator that runs or collects final product-grade verification commands, captures sanitized stdout/stderr artifacts, hashes generated evidence, and writes `.omo/evidence/release-product-grade-index.json` following the Task 1 schema. Add a final artifact pack summary that points to install smoke, product QA matrix, GUI/TUI evidence, security matrix, docs checks, package pack output, and CI/local release results.
  **Must NOT do**: Do not include raw secrets, absolute private paths, unredacted temp roots, old unrelated `.omo/evidence` files, or draft plans in the release index. Do not mutate project scaffold files.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: Task 16 and Final Verification | Blocked By: Tasks 1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14

  **References**:
  - Pattern: `.omo/evidence/final-metis-terminal-first.md` - existing final evidence summary style.
  - Pattern: `.omo/evidence/task-12-tui-80.txt` - existing TUI transcript evidence.
  - Pattern: `.omo/evidence/task-8-gui-desktop.png` - existing GUI screenshot evidence.
  - Pattern: `docs/PRODUCT-GRADE.md` - release evidence schema from Task 1.
  - Target new file: `scripts/release-evidence.js`.

  **Acceptance Criteria**:
  - [ ] `npm run evidence:release` writes `.omo/evidence/release-product-grade-index.json`.
  - [ ] Index entries include command, status, exit code, stdout/stderr artifact path, related artifacts, SHA-256, timestamp, duration, platform, Node version, and redaction status.
  - [ ] Index includes `npm run check`, `npm run smoke:install`, `npm run qa:product`, `npm pack --dry-run`, docs check, no-network check, and final scope-fidelity search.
  - [ ] Index references only current product-grade evidence prefix or explicitly marked final verification files.
  - [ ] Redaction scan passes for the index and every referenced artifact.
  - [ ] A markdown summary `.omo/evidence/release-product-grade-summary.md` is generated from the index.

  **QA Scenarios**:
  ```text
  Scenario: Release evidence index generated from real commands
    Tool: npm
    Steps: npm run evidence:release
    Expected: exits 0, JSON index matches schema, markdown summary exists, all referenced artifacts exist and hashes verify
    Evidence: .omo/evidence/release-product-grade-index.json

  Scenario: Release evidence generator rejects stale or unsafe artifact
    Tool: node
    Steps: run generator against a temp evidence directory containing stale prefix and raw canary artifact
    Expected: generator exits non-zero and reports stale/unsafe artifact without adding it to release index
    Evidence: .omo/evidence/task-15-release-evidence-rejects-unsafe.txt
  ```

  **Commit**: YES | Message: `chore(release): generate product evidence index` | Files: `package.json`, `scripts/release-evidence.js`, `.omo/evidence/release-product-grade-index.json`, `.omo/evidence/release-product-grade-summary.md`

- [ ] 16. CI and release readiness workflow

  **What to do**: Add a CI/release readiness workflow and local release checklist that run the same product gates as a maintainer would run locally. Prefer GitHub Actions if the repository uses or accepts `.github/workflows`; otherwise add a documented local CI script and explain the fallback in `docs/RELEASE.md`. Matrix should cover Node.js 18, 20, and current LTS on Windows and Ubuntu at minimum, with macOS optional if runtime budget allows.
  **Must NOT do**: Do not publish automatically, do not push tags, do not upload secrets, do not require network services beyond normal CI package installation, and do not skip Windows because this workspace is Windows-based.

  **Parallelization**: Can Parallel: YES | Wave 5 | Blocks: Final Verification | Blocked By: Tasks 2, 11, 12, 13, 14, 15

  **References**:
  - Pattern: `package.json:11` - product gates from scripts.
  - Pattern: `docs/RELEASE.md` - release checklist from Task 13.
  - Pattern: `scripts/install-smoke.js` - clean install smoke from Task 11.
  - Pattern: `scripts/product-qa.js` - product QA matrix from Task 12.
  - Pattern: `scripts/release-evidence.js` - release evidence generator from Task 15.
  - Target new file: `.github/workflows/ci.yml` or `scripts/local-ci.js` plus docs fallback.

  **Acceptance Criteria**:
  - [ ] CI or local CI runs `npm ci` when lockfile exists, otherwise `npm install`, then `npm run check`, `npm run smoke:install`, `npm run qa:product`, and `npm run evidence:release`.
  - [ ] Workflow covers Windows and Ubuntu with Node.js 18 and 20; current LTS is included if different.
  - [ ] Release docs explain how to run the same gates locally and how to inspect release evidence.
  - [ ] CI never publishes or uploads sensitive evidence automatically.
  - [ ] Final workflow status or local CI transcript is captured under `.omo/evidence/task-16-*`.

  **QA Scenarios**:
  ```text
  Scenario: Local CI gate passes
    Tool: npm
    Steps: run the local CI script or the exact documented command sequence from docs/RELEASE.md
    Expected: exits 0 and includes check, install smoke, product QA, and evidence release stages
    Evidence: .omo/evidence/task-16-local-ci-pass.txt

  Scenario: CI config rejects publish side effects
    Tool: node
    Steps: parse workflow/local CI config and search for npm publish, git push, secret upload, telemetry, or remote artifact upload steps
    Expected: forbidden publish/secret-upload steps are absent
    Evidence: .omo/evidence/task-16-ci-no-publish-side-effects.txt
  ```

  **Commit**: YES | Message: `ci(release): add product readiness gates` | Files: `.github/workflows/ci.yml`, `scripts/local-ci.js`, `docs/RELEASE.md`, `.omo/evidence/task-16-*`

## Final Verification Wave
> ALL automated gates must APPROVE. Report consolidated results to the user after verification; user confirmation is not a verification dependency.

- [ ] F1. Plan Compliance Audit

  **What to do**: Verify every product-grade task acceptance criterion has direct evidence and every referenced file/task is present.
  **Acceptance Criteria**:
  - [ ] Every task has happy and failure/edge QA evidence.
  - [ ] `.omo/evidence/release-product-grade-index.json` includes every final verification command.
  - [ ] No unresolved decision placeholders remain in plan/docs.
  **QA Scenarios**:
  ```text
  Scenario: Product-grade checklist audit
    Tool: node
    Steps: inspect .omo/evidence, docs, package metadata, and plan checkboxes
    Expected: every task has evidence and no unresolved decision placeholders
    Evidence: .omo/evidence/f1-product-grade-plan-compliance.txt
  ```

- [ ] F2. Code Quality Review

  **What to do**: Run full syntax, tests, LOC, dependency, and static no-network checks.
  **Acceptance Criteria**:
  - [ ] `npm test` passes.
  - [ ] `npm run check` passes.
  - [ ] every hand-authored source/test file is under 250 pure LOC or has a documented exception.
  - [ ] package has no runtime dependencies.
  - [ ] static search finds no remote-call modules or telemetry paths.
  **QA Scenarios**:
  ```text
  Scenario: Full quality gate
    Tool: npm + node + rg
    Steps: npm test; npm run check; run LOC checker; run no-network static search
    Expected: all commands exit 0 and max pure LOC is reported
    Evidence: .omo/evidence/f2-product-grade-code-quality.txt
  ```

- [ ] F3. Real Manual QA

  **What to do**: Run CLI/TUI/GUI/evolve/package/install smoke on copied temp projects.
  **Acceptance Criteria**:
  - [ ] fresh install smoke works from packed artifact.
  - [ ] TUI 80/100/140 column scripted and PTY smoke pass.
  - [ ] GUI desktop/narrow screenshots pass with no mutation controls.
  - [ ] apply/rollback restores temp fixture byte-for-byte.
  - [ ] evolve proposal persistence/list/inspect/dismiss paths pass.
  - [ ] all temp resources are removed.
  **QA Scenarios**:
  ```text
  Scenario: Product-grade end-to-end smoke
    Tool: npm + PTY + Browser
    Steps: run packed install, CLI matrix, TUI matrix, GUI preview, evolve proposal, apply/rollback on temp roots
    Expected: all pass, no canaries, temp roots removed
    Evidence: .omo/evidence/f3-product-grade-real-manual-qa.txt
  ```

- [ ] F4. Scope Fidelity Check

  **What to do**: Confirm product-grade release did not violate non-goals or safety promises.
  **Acceptance Criteria**:
  - [ ] no chat runtime, cloud sync, model gateway, telemetry, remote backend, localhost GUI server, or GUI mutation controls introduced.
  - [ ] docs accurately describe read-only GUI and explicit TUI apply.
  - [ ] `pca` compatibility policy is documented and tested.
  **QA Scenarios**:
  ```text
  Scenario: Scope and safety search
    Tool: rg
    Steps: search code/docs for chat/cloud/telemetry/server/apply-control claims and inspect matches
    Expected: only non-goal, guardrail, or explicit future-plan mentions remain
    Evidence: .omo/evidence/f4-product-grade-scope-fidelity.txt
  ```

## Commit Strategy

- One cohesive commit per task unless a task only updates release evidence.
- Do not mix release metadata, TUI UX, GUI UX, evolve persistence, and docs in the same commit unless the task explicitly spans them.
- Tests and product behavior ship in the same commit.
- Release evidence and changelog updates are last implementation commits before final verification.

## Success Criteria

- A user can install or run Metis from a packed artifact and complete a safe scan → review → dry-run → apply → rollback workflow.
- The TUI feels like a polished command workbench, not a transcript dump.
- The GUI preview is useful as a read-only review dashboard.
- Evolve proposals are reviewable and persistent rather than transient text.
- Release artifacts, docs, tests, and evidence prove product readiness without relying on human memory.
- Metis keeps its defining trust boundary: local-first, dependency-light, no telemetry, no silent writes, no raw secret display.
