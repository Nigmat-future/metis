# Metis Terminal-First TUI And GUI Plan

## TL;DR
> **Summary**: Rebrand PCA into Metis and add a terminal-first product surface: `metis tui` is the primary interactive workflow, while `metis gui --preview` is a read-only browser/desktop-style preview and management panel. The existing local-first safety model remains the product boundary.
> **Deliverables**:
> - Metis brand and command aliases
> - shared workflow API for CLI/TUI/GUI
> - interactive TUI for scan, plan, evidence, diff, apply, rollback, and evolve review
> - read-only GUI preview/management dashboard
> - compatibility bridge for existing `pca` command and `.pca` artifacts
> - tests, QA fixtures, docs, and safety regression gates
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 -> Task 2 -> Task 3 -> Task 5 -> Task 7 -> Final Verification

## Context

### Original Request
User chose the Terminal-first option:

> A. Terminal-first（推荐）先做 metis tui，GUI 做只读 preview/管理面板。最快保留当前 CLI 优势，也最像 Codex 的使用心智

Earlier confirmed brand name: **Metis**.

### Interview Summary
- Product priority: terminal-first.
- TUI is the main workflow surface.
- GUI is read-only preview/management, not an apply surface in first release.
- Current codebase is a Node.js 18+ CommonJS CLI with strong local-first safety boundaries.
- Core package must keep zero runtime dependencies.
- UI dependencies are allowed only in separated UI modules or packages.
- Codex is a reference for terminal-first local workflow and multi-surface command architecture.
- Hermes is a reference for shared core/multi-surface UX and controlled evolution, not for turning Metis into a chat runtime.

### Metis Review (gaps addressed)
- Risk: rebrand could break existing users. Addressed by keeping `pca` as a compatibility alias for one release and reading legacy `.pca` artifacts.
- Risk: TUI/GUI could duplicate CLI business logic. Addressed by first extracting shared workflow APIs that all surfaces call.
- Risk: GUI write actions increase trust burden. Addressed by making GUI read-only in first release.
- Risk: UI dependencies could violate zero-dependency promise. Addressed by keeping core dependency-free and isolating optional UI dependencies.
- Risk: "Hermes-like" could scope-creep into chat/self-evolution. Addressed by excluding chat runtime, remote backend, and silent self-evolution.
- Risk: GUI preview could expose sensitive local data through a server. Addressed by making first GUI release a static HTML export with no localhost server.
- Risk: UI dependencies could make installs unreproducible. Addressed by using Node stdlib for first TUI/GUI release; if a dev-only browser test dependency is added later, create and commit `package-lock.json`.

## Work Objectives

### Core Objective
Turn the usable PCA CLI into **Metis**, a local-first personal coding-agent scaffold manager with a terminal-first TUI and a read-only GUI preview.

### Deliverables
- `metis` CLI command with `pca` compatibility alias.
- `metis tui` interactive terminal workflow.
- `metis gui --preview` read-only dashboard command.
- `.metis/evidence/index.json` and `.metis/rollback/<id>.json` as new canonical artifact paths.
- Legacy `.pca` compatibility for reading evidence and rollback records during transition.
- Shared workflow API under `lib/workflows/` or equivalent.
- First-release TUI and GUI implemented with Node stdlib only; no new runtime dependency.
- TUI state machine, renderer, and keyboard input tests.
- GUI preview renderer and browser-based QA tests.
- Updated README, PRD, architecture, security, and contributing docs.

### Definition of Done
- `node bin/metis.js scan --fixture test/fixtures/mixed-agent-project` works.
- `node bin/pca.js scan --fixture test/fixtures/mixed-agent-project` still works as deprecated alias.
- `node bin/metis.js tui --fixture test/fixtures/mixed-agent-project` can complete scan -> plan -> diff preview -> apply confirmation -> rollback path without raw secret leakage.
- `node bin/metis.js gui --preview --fixture test/fixtures/mixed-agent-project --out <temp-html>` produces a read-only HTML dashboard with evidence, candidates, audit, diff, and rollback metadata sections.
- GUI preview has no apply/rollback write controls.
- `npm test` passes.
- syntax checks pass for all source and test files.
- no output or generated preview contains fake secret/private path canaries.
- core `bin/` and `lib/core`, `lib/adapters`, `lib/auditor`, `lib/applier`, `lib/generator`, `lib/planner`, `lib/workflows` remain free of remote-call modules and telemetry.
- GUI first release does not start a local HTTP server; it writes an explicit or temp static HTML preview and prints the path.

### Must Have
- Local-first, no telemetry.
- No silent writes.
- No raw secret display.
- No symlink/junction traversal.
- High-risk audit blocks apply paths.
- GUI first release is read-only.
- TUI apply requires explicit confirmation.
- All UI surfaces reuse shared workflows.
- Existing CLI behavior remains green.
- New rollback ids use `metis-<timestamp>`; legacy `pca-*` ids remain readable for compatibility.
- Non-TTY TUI fallback exits 2 with a clear message unless `--script` is supplied.

### Must NOT Have
- No chat runtime.
- No cloud sync.
- No model gateway.
- No remote backend.
- No GUI apply button in first release.
- No GUI localhost server in first release.
- No automatic permission broadening.
- No silent self-evolution.
- No rewriting source files outside this plan during planning.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.

- Test decision: tests-after for refactor and new UI, using existing `node:test`; first pass uses static HTML assertions and Browser/Chrome manual QA. Add Playwright only as a dev dependency if static assertions plus Browser QA are insufficient, and commit a lockfile if added.
- QA policy: every task includes agent-executed scenarios.
- Evidence: `.omo/evidence/task-{N}-metis-*`.
- Manual QA surfaces:
  - TUI: spawned Node process with scripted stdin and stdout transcript artifact.
  - GUI: generated static HTML opened by Playwright or in-app Browser; screenshot and DOM assertions.

## Execution Strategy

### Parallel Execution Waves
Wave 1: Tasks 1-4 foundation and contracts.
Wave 2: Tasks 5-8 TUI and GUI surfaces.
Wave 3: Tasks 9-11 compatibility, docs, security hardening.
Wave 4: Tasks 12-13 final UX polish and release validation.

### Dependency Matrix
- Task 1 blocks Tasks 2, 9, 10.
- Task 2 blocks Tasks 3, 5, 7.
- Task 3 blocks Tasks 5, 7, 8.
- Task 4 can run after Task 2.
- Task 5 blocks Task 6.
- Task 7 blocks Task 8.
- Task 9 depends on Tasks 1-3.
- Task 10 depends on Tasks 1, 5, 7.
- Task 11 depends on Tasks 3, 5, 7.
- Task 12 depends on Tasks 5-11.
- Task 13 depends on all implementation tasks.

## TODOs

- [x] 1. Rebrand Package And CLI Entrypoints

  **What to do**: Rename product-facing surfaces from PCA to Metis while preserving compatibility. Add `bin/metis.js` as the canonical entrypoint. Keep `bin/pca.js` as a deprecated compatibility alias that calls the same command runner. Update `package.json` to expose both `metis` and `pca`, with package name changed to `metis` unless npm availability research later proves this impossible. Update help text to say "Metis" and mention `pca` deprecation only in help/docs.
  **Must NOT do**: Do not delete `bin/pca.js`. Do not remove existing commands. Do not rename test fixtures.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 2, 9, 10 | Blocked By: none

  **References**:
  - Pattern: `E:\Coding Agent\bin\pca.js` - current minimal entrypoint pattern.
  - Pattern: `E:\Coding Agent\lib\cli\args.js` - current command validation contract.
  - Pattern: `E:\Coding Agent\lib\cli\output.js` - current help and output wording.
  - Pattern: `E:\Coding Agent\package.json` - current package/bin/script metadata.

  **Acceptance Criteria**:
  - [ ] `node bin/metis.js --help` exits 0 and prints Metis help.
  - [ ] `node bin/pca.js --help` exits 0 and prints compatibility/deprecation note.
  - [ ] `node bin/metis.js scan --fixture test/fixtures/mixed-agent-project` exits 0.
  - [ ] `node bin/pca.js scan --fixture test/fixtures/mixed-agent-project` exits 0.
  - [ ] `package.json` has both `bin.metis` and `bin.pca`.
  - [ ] `npm test` still passes existing CLI tests after updating expected brand text.

  **QA Scenarios**:
  ```text
  Scenario: Canonical Metis command works
    Tool: bash
    Steps: node bin/metis.js scan --fixture test/fixtures/mixed-agent-project
    Expected: exit 0, output contains "Metis", output contains "Writes: none"
    Evidence: .omo/evidence/task-1-metis-scan.txt

  Scenario: Legacy pca alias still works
    Tool: bash
    Steps: node bin/pca.js scan --fixture test/fixtures/mixed-agent-project
    Expected: exit 0, output contains deprecation/alias note only in help or stderr-free normal output policy chosen by implementation
    Evidence: .omo/evidence/task-1-pca-alias.txt
  ```

  **Commit**: YES | Message: `feat(brand): introduce metis cli alias` | Files: `package.json`, `bin/metis.js`, `bin/pca.js`, `lib/cli/*`, `test/*`

- [x] 2. Extract Shared Workflow API

  **What to do**: Move command business logic out of CLI-only runner into a reusable workflow module. Add functions such as `resolveRootWorkflow`, `scanWorkflow`, `planWorkflow`, `initDryRunWorkflow`, `applyWorkflow`, `rollbackWorkflow`, `evolveWorkflow`, and `previewWorkflow`. Each workflow returns structured data plus redacted display strings; CLI formats the same data as today. Keep current `run(argv, cwd)` as a thin adapter.
  **Must NOT do**: Do not let TUI/GUI call subprocesses for normal flows. Do not duplicate scan/plan/generate/audit logic in UI modules.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3, 4, 5, 7 | Blocked By: 1

  **References**:
  - Pattern: `E:\Coding Agent\lib\cli\commands.js` - current orchestration logic to extract.
  - Pattern: `E:\Coding Agent\lib\adapters\index.js` - `scanAll()` entry.
  - Pattern: `E:\Coding Agent\lib\generator\scaffold.js` - dry-run/apply generation contract.
  - Pattern: `E:\Coding Agent\lib\planner\evolve.js` - evolution proposal contract.

  **Acceptance Criteria**:
  - [ ] `lib/workflows/index.js` exists and exports named workflow functions.
  - [ ] `lib/cli/commands.js` calls workflow functions rather than directly orchestrating adapters/planner/generator.
  - [ ] JSON output for `plan --json` remains stable for existing fixtures except intentional `.metis` path changes covered by tests.
  - [ ] No workflow function writes unless its name is `applyWorkflow` or `rollbackWorkflow`.

  **QA Scenarios**:
  ```text
  Scenario: Workflow returns scan data without writes
    Tool: node --test
    Steps: import workflow in a new test and call scanWorkflow(tempFixture, { includeHistory: false })
    Expected: evidence array exists, no .metis/.pca directory created
    Evidence: .omo/evidence/task-2-workflow-scan.tap

  Scenario: CLI output remains compatible
    Tool: bash
    Steps: node bin/metis.js plan --fixture test/fixtures/mixed-agent-project --json
    Expected: JSON parses, candidates include evidenceIds, audit.ok is true
    Evidence: .omo/evidence/task-2-cli-json.txt
  ```

  **Commit**: YES | Message: `refactor(core): extract shared metis workflows` | Files: `lib/workflows/*`, `lib/cli/commands.js`, `test/*`

- [x] 3. Add Metis Artifact Path Compatibility

  **What to do**: Make `.metis/evidence/index.json` and `.metis/rollback/<id>.json` the new canonical artifact paths. New rollback ids use `metis-<timestamp>`. Keep reading `.pca/evidence/index.json` for evolve if `.metis` is absent. Keep rollback able to read `.pca/rollback/<id>.json` and legacy `pca-*` ids when `.metis` record is absent. Generated scaffolds should use `<!-- METIS:BEGIN -->` and `<!-- METIS:END -->`, while preserving and updating existing `<!-- PCA:BEGIN -->` sections during transition.
  **Must NOT do**: Do not leave both PCA and Metis managed sections in the same generated file. Do not change whitelist without tests.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 5, 7, 8, 9 | Blocked By: 2

  **References**:
  - Pattern: `E:\Coding Agent\lib\generator\scaffold.js` - marker and target list.
  - Pattern: `E:\Coding Agent\lib\applier\apply.js` - writable path whitelist.
  - Pattern: `E:\Coding Agent\lib\applier\rollback.js` - rollback path lookup and validation.
  - Pattern: `E:\Coding Agent\lib\planner\evolve.js` - evidence index lookup.

  **Acceptance Criteria**:
  - [ ] New apply writes `.metis/evidence/index.json`.
  - [ ] New apply writes `.metis/rollback/<id>.json`.
  - [ ] Rollback restores from `.metis/rollback/<id>.json`.
  - [ ] New rollback id begins with `metis-`.
  - [ ] Evolve reads `.metis/evidence/index.json`.
  - [ ] Legacy `.pca` evidence/rollback files are read when `.metis` files do not exist.
  - [ ] Generated files contain one managed section using METIS markers.

  **QA Scenarios**:
  ```text
  Scenario: New Metis artifact path
    Tool: bash
    Steps: copy mixed fixture to temp; node bin/metis.js init --apply --yes --fixture <temp>
    Expected: .metis/evidence/index.json and .metis/rollback/<id>.json exist, .pca is not created
    Evidence: .omo/evidence/task-3-metis-artifacts.txt

  Scenario: Legacy PCA rollback compatibility
    Tool: node --test
    Steps: seed temp fixture with old .pca/rollback/<id>.json then run rollback
    Expected: rollback succeeds and restores files
    Evidence: .omo/evidence/task-3-pca-compat.tap
  ```

  **Commit**: YES | Message: `feat(core): migrate artifacts to metis paths` | Files: `lib/generator/scaffold.js`, `lib/applier/*`, `lib/planner/evolve.js`, `test/*`

- [x] 4. Define UI View Models

  **What to do**: Add a dependency-free view-model module that converts workflow outputs into UI-ready structures: summary counts, evidence rows, candidate rows, audit issue rows, diff chunks, rollback records, and action availability. Include stable ids and redacted display strings. CLI/TUI/GUI all consume these models.
  **Must NOT do**: Do not include raw file content or raw secrets in view models. Do not include apply actions for GUI.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5, 7 | Blocked By: 2

  **References**:
  - Pattern: `E:\Coding Agent\lib\core\evidence.js` - normalized redacted evidence fields.
  - Pattern: `E:\Coding Agent\lib\cli\output.js` - existing scan/plan presentation shape.
  - Pattern: `E:\Coding Agent\lib\auditor\safety.js` - audit issue shape.

  **Acceptance Criteria**:
  - [ ] `lib/ui/view-model.js` or equivalent exists and has no external dependencies.
  - [ ] Evidence/candidate/audit/diff models contain no raw fake canaries.
  - [ ] GUI view model marks apply/rollback as unavailable.
  - [ ] TUI view model marks apply as available only after dry-run and audit ok.

  **QA Scenarios**:
  ```text
  Scenario: Sensitive fixture view model is redacted
    Tool: node --test
    Steps: build preview model for sensitive-metadata-project
    Expected: serialized model does not contain sk-pca-fake-secret, VeryPrivateName, or prompt-injection markers
    Evidence: .omo/evidence/task-4-redacted-model.tap

  Scenario: GUI model cannot write
    Tool: node --test
    Steps: build GUI preview model for mixed fixture
    Expected: action list has no apply/rollback write action
    Evidence: .omo/evidence/task-4-gui-readonly.tap
  ```

  **Commit**: YES | Message: `feat(ui): add shared metis view models` | Files: `lib/ui/*`, `test/*`

- [x] 5. Implement TUI State Machine

  **What to do**: Build a testable TUI state machine before renderer work. States: welcome, root selection, scan results, candidate plan, evidence detail, audit detail, dry-run diff, apply confirm, apply result, rollback select, rollback result, evolve proposal, error. Events: start, rescan, select evidence, select candidate, preview diff, confirm apply, cancel apply, run rollback, run evolve, quit. Apply confirmation requires exact typed confirmation `APPLY METIS`; rollback requires selecting an id from known rollback records.
  **Must NOT do**: Do not call workflows directly from key handlers without state validation. Do not allow apply from GUI state. Do not apply when audit failed.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6 | Blocked By: 2, 3, 4

  **References**:
  - Pattern: `E:\Coding Agent\lib\cli\args.js` - command validation style to mirror in state transitions.
  - Pattern: `E:\Coding Agent\lib\applier\apply.js` - explicit apply safety boundary.
  - External: `https://github.com/openai/codex` - terminal-first local coding agent reference.

  **Acceptance Criteria**:
  - [ ] TUI state machine is pure/testable without terminal IO.
  - [ ] Apply cannot be reached before dry-run and audit ok.
  - [ ] Apply requires exact `APPLY METIS`.
  - [ ] Cancel returns to diff view without writes.
  - [ ] Audit failure state exposes issue list and no apply transition.

  **QA Scenarios**:
  ```text
  Scenario: Happy state path
    Tool: node --test
    Steps: feed events start -> scan -> plan -> preview diff -> type APPLY METIS
    Expected: apply workflow invoked exactly once after confirmation
    Evidence: .omo/evidence/task-5-state-happy.tap

  Scenario: Audit failure blocks apply
    Tool: node --test
    Steps: use sensitive fixture state, attempt preview/apply transition
    Expected: state remains audit detail/error, apply workflow invocation count is 0
    Evidence: .omo/evidence/task-5-state-audit-block.tap
  ```

  **Commit**: YES | Message: `feat(tui): add metis state machine` | Files: `lib/tui/state.js`, `test/*`

- [x] 6. Implement Terminal Renderer And `metis tui`

  **What to do**: Add `tui` command and renderer. First implementation must use Node stdlib terminal capabilities. If a dependency is later proposed, stop and update this plan before implementation. Layout: top title/status bar, left workflow rail, main panel, right/detail panel where terminal width permits, bottom action/status line. Panels: evidence table, candidate list, audit issues, diff preview, rollback records, evolve proposals. Support non-interactive smoke mode `metis tui --script <file>` for tests, where script lines map to deterministic TUI events. Add `--script <path>` to argument parsing and make non-TTY interactive mode exit 2 with guidance to use `--script` or normal CLI commands.
  **Must NOT do**: Do not use remote calls. Do not show raw secrets. Do not leave terminal raw mode enabled after exit.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 10, 12 | Blocked By: 5

  **References**:
  - Pattern: `E:\Coding Agent\lib\cli\commands.js` - add command dispatch without breaking existing commands.
  - Pattern: `E:\Coding Agent\lib\cli\output.js` - human-readable wording style.
  - Pattern: `E:\Coding Agent\test\pca-cli.test.js` - subprocess testing pattern.
  - External: `https://github.com/openai/codex` - terminal-first local agent reference.

  **Acceptance Criteria**:
  - [ ] `node bin/metis.js tui --fixture test/fixtures/mixed-agent-project --script test/fixtures/tui/happy.txt` exits 0.
  - [ ] `node bin/metis.js tui --fixture test/fixtures/mixed-agent-project` exits 2 in non-TTY CI.
  - [ ] transcript contains Metis title, evidence count, candidate count, audit status, and diff preview label.
  - [ ] scripted cancel apply path exits 0 and writes no files.
  - [ ] scripted apply path writes only whitelisted `.metis` artifacts and scaffold files.
  - [ ] terminal cleanup test proves raw mode is disabled after exit.

  **QA Scenarios**:
  ```text
  Scenario: Scripted TUI dry-run path
    Tool: bash
    Steps: node bin/metis.js tui --fixture test/fixtures/mixed-agent-project --script test/fixtures/tui/dry-run.txt
    Expected: exit 0, transcript contains "Diff Preview", temp fixture unchanged
    Evidence: .omo/evidence/task-6-tui-dry-run.txt

  Scenario: Scripted TUI apply cancel
    Tool: bash
    Steps: node bin/metis.js tui --fixture <temp-mixed> --script test/fixtures/tui/cancel-apply.txt
    Expected: exit 0, no .metis directory, output contains "Cancelled"
    Evidence: .omo/evidence/task-6-tui-cancel.txt
  ```

  **Commit**: YES | Message: `feat(tui): add terminal workflow command` | Files: `lib/tui/*`, `lib/cli/*`, `bin/metis.js`, `test/*`, `test/fixtures/tui/*`

- [x] 7. Implement Read-Only GUI Preview Model And Renderer

  **What to do**: Add `metis gui --preview` command that produces a local static HTML preview by default. Required flags: `--preview`. Optional flags: `--fixture <path>`, `--include-history`, `--out <path>`, `--json`. If `--out` is missing, write to an OS temp file and print the path. HTML must be self-contained and read-only. The command snapshots current workflow data once; it does not watch files and does not start a localhost server. Sections: overview, evidence browser, candidates, safety audit, diff preview, rollback ledger/status, evolve proposal preview. Use restrained operational UI, not a marketing landing page.
  **Must NOT do**: Do not add apply/rollback mutation controls. Do not start a server in the first GUI release. Do not include raw evidence content.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 8, 10, 12 | Blocked By: 3, 4

  **References**:
  - Pattern: `E:\Coding Agent\lib\generator\scaffold.js` - diff content source.
  - Pattern: `E:\Coding Agent\lib\core\redactor.js` - redaction boundary.
  - External: `https://github.com/nousresearch/hermes-agent` - shared core/multi-surface reference.
  - External: `https://hermes-agent.nousresearch.com/docs/user-guide/desktop` - desktop/web UI reference; use as inspiration only.

  **Acceptance Criteria**:
  - [ ] `node bin/metis.js gui --preview --fixture test/fixtures/mixed-agent-project --out <temp>/preview.html` exits 0.
  - [ ] generated HTML includes evidence, candidates, audit, diff, and rollback sections.
  - [ ] generated HTML does not include apply/rollback mutation buttons.
  - [ ] generated HTML contains no fake secret/private path canaries.
  - [ ] `gui` without `--preview` exits 2.
  - [ ] source search confirms `gui` implementation does not import `http`, `https`, `net`, `tls`, or call `fetch`.

  **QA Scenarios**:
  ```text
  Scenario: GUI preview generated
    Tool: bash
    Steps: node bin/metis.js gui --preview --fixture test/fixtures/mixed-agent-project --out <temp>/preview.html
    Expected: exit 0, file exists, HTML contains "Evidence", "Candidates", "Safety Audit", "Diff Preview"
    Evidence: .omo/evidence/task-7-gui-preview.html

  Scenario: GUI preview is read-only
    Tool: node --test
    Steps: parse generated HTML and query buttons/forms/actions
    Expected: no form or button has data-action apply, rollback, write, or mutate
    Evidence: .omo/evidence/task-7-gui-readonly.tap
  ```

  **Commit**: YES | Message: `feat(gui): add read-only metis preview` | Files: `lib/gui/*`, `lib/cli/*`, `test/*`

- [x] 8. Browser Verify GUI Preview

  **What to do**: Add browser-level verification for the static GUI preview. Use the in-app Browser/Chrome DevTools tool during QA and keep automated DOM assertions in `node:test`. Add Playwright only if Browser QA cannot produce required artifacts; if added, add package-lock and document the dev dependency. Verify desktop and mobile-ish viewport rendering, no text overlap in key sections, read-only controls, and canary redaction.
  **Must NOT do**: Do not make GUI a landing page. Do not use decorative cards inside cards. Do not create a server unless future plan explicitly changes GUI mode.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 12 | Blocked By: 7

  **References**:
  - Pattern: `E:\Coding Agent\test\pca-cli.test.js` - no-canary assertion style.
  - External: browser verification guidance from active frontend instructions.

  **Acceptance Criteria**:
  - [ ] Browser screenshot artifact exists for desktop preview.
  - [ ] Browser screenshot artifact exists for narrow/mobile preview.
  - [ ] DOM assertion confirms no mutation controls exist.
  - [ ] DOM assertion confirms fake canaries are absent.
  - [ ] GUI visual QA report is saved under `.omo/evidence/`.

  **QA Scenarios**:
  ```text
  Scenario: Desktop GUI visual check
    Tool: Browser or Playwright
    Steps: open generated preview.html at 1440x900
    Expected: overview/evidence/candidates/audit/diff sections visible; no overlapping text; screenshot saved
    Evidence: .omo/evidence/task-8-gui-desktop.png

  Scenario: Narrow GUI visual check
    Tool: Browser or Playwright
    Steps: open generated preview.html at 390x844
    Expected: sections stack cleanly; text remains readable; no apply controls
    Evidence: .omo/evidence/task-8-gui-mobile.png
  ```

  **Commit**: YES | Message: `test(gui): verify metis preview rendering` | Files: `test/*`, `.omo/evidence/*` if evidence is tracked by workflow policy

- [x] 9. Add Legacy Compatibility Tests

  **What to do**: Add focused tests for compatibility surfaces: `pca` alias, legacy `.pca` evidence index for evolve, legacy rollback record, old PCA markers converted to METIS markers, and no duplicate managed sections. These tests prevent the rebrand from breaking current fixtures/users.
  **Must NOT do**: Do not preserve old branding in new generated content except compatibility/deprecation messages.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 1, 3

  **References**:
  - Pattern: `E:\Coding Agent\test\security-regressions.test.js` - regression style.
  - Pattern: `E:\Coding Agent\test\helpers\fixtures.js` - temp fixture snapshot helper.
  - Pattern: `E:\Coding Agent\lib\generator\scaffold.js` - marker merge behavior.

  **Acceptance Criteria**:
  - [ ] `pca` alias test passes.
  - [ ] `.pca/evidence/index.json` is read by evolve when `.metis` is absent.
  - [ ] `.pca/rollback/<id>.json` rollback works when `.metis` is absent.
  - [ ] file with old PCA markers becomes exactly one METIS managed section after apply/dry-run.

  **QA Scenarios**:
  ```text
  Scenario: Legacy evolve evidence
    Tool: node --test
    Steps: seed temp fixture with .pca/evidence/index.json only; run metis evolve --dry-run
    Expected: exit 0 and proposal output uses existing evidence baseline
    Evidence: .omo/evidence/task-9-legacy-evolve.tap

  Scenario: Marker migration
    Tool: node --test
    Steps: seed AGENTS.md with PCA markers; run metis init --dry-run
    Expected: preview shows METIS markers and no duplicate PCA section
    Evidence: .omo/evidence/task-9-marker-migration.tap
  ```

  **Commit**: YES | Message: `test(compat): cover pca to metis migration` | Files: `test/*`, `test/fixtures/*`

- [x] 10. Update Product Documentation

  **What to do**: Update README, PRD, Architecture, Security, and Contributing docs for Metis. README first screen should show terminal-first flow: `metis tui`, `metis scan`, `metis plan`, `metis init --dry-run`. Add "GUI Preview" section that clearly says read-only. Document `pca` alias deprecation and `.pca` compatibility. Preserve safety boundary language.
  **Must NOT do**: Do not claim Metis is a new chat agent runtime. Do not imply GUI can apply writes.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 1, 6, 7

  **References**:
  - Pattern: `E:\Coding Agent\README.md` - current user docs.
  - Pattern: `E:\Coding Agent\docs\PRD.md` - current product scope.
  - Pattern: `E:\Coding Agent\docs\ARCHITECTURE.md` - architecture flow.
  - Pattern: `E:\Coding Agent\SECURITY.md` - safety boundary wording.
  - Pattern: `E:\Coding Agent\CONTRIBUTING.md` - verification commands and fixture rules.

  **Acceptance Criteria**:
  - [ ] README title and examples use Metis.
  - [ ] README includes `metis tui` as primary path.
  - [ ] README states GUI preview is read-only.
  - [ ] PRD non-goals still exclude chat UI/runtime.
  - [ ] Security doc covers TUI/GUI canary redaction and GUI no-write policy.
  - [ ] Contributing doc includes TUI scripted QA and GUI preview QA.

  **QA Scenarios**:
  ```text
  Scenario: Docs command examples are executable
    Tool: bash
    Steps: run every command block marked as smoke-testable in README
    Expected: commands exit with documented status
    Evidence: .omo/evidence/task-10-docs-smoke.txt

  Scenario: Docs do not overpromise
    Tool: rg
    Steps: rg -n "chat runtime|cloud sync|GUI apply|automatic self-evolution" README.md docs SECURITY.md CONTRIBUTING.md
    Expected: only non-goal/guardrail mentions, no product claims
    Evidence: .omo/evidence/task-10-docs-scope.txt
  ```

  **Commit**: YES | Message: `docs: rename pca to metis and document ui surfaces` | Files: `README.md`, `docs/*`, `SECURITY.md`, `CONTRIBUTING.md`

- [x] 11. Harden UI Security And Redaction Tests

  **What to do**: Add UI-specific security tests for TUI transcripts and GUI HTML. Reuse fake canaries: `sk-pca-fake-secret`, `ghp_abcdefghijklmnopqrstuvwxyz123456`, `internal.customer.example`, `C:\Users\VeryPrivateName`, `/Users/very-private-name`, prompt-injection phrases. Extend static remote-call checks so core and first-release GUI/TUI remain no-network. If a future GUI server mode is introduced, it must be a separate plan.
  **Must NOT do**: Do not weaken existing remote-call static assertion for core. Do not whitelist broad network code in shared modules.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 12 | Blocked By: 5, 7

  **References**:
  - Pattern: `E:\Coding Agent\test\security-regressions.test.js` - security canary regression style.
  - Pattern: `E:\Coding Agent\test\pca-cli.test.js` - remote-call static assertion.
  - Pattern: `E:\Coding Agent\lib\core\redactor.js` - redaction patterns.

  **Acceptance Criteria**:
  - [ ] TUI transcript tests contain no fake canaries.
  - [ ] GUI HTML tests contain no fake canaries.
  - [ ] GUI read-only test fails if apply/rollback mutation controls appear.
  - [ ] Core remote-call static assertion still covers core/workflows/adapters/auditor/applier/generator/planner.
  - [ ] No runtime UI dependency is introduced in first release.

  **QA Scenarios**:
  ```text
  Scenario: Sensitive TUI transcript
    Tool: bash
    Steps: run scripted TUI against sensitive fixture and capture transcript
    Expected: exit 1 or audit block, transcript contains Safety audit failed and no canaries
    Evidence: .omo/evidence/task-11-tui-sensitive.txt

  Scenario: Sensitive GUI preview
    Tool: bash
    Steps: generate GUI preview for sensitive fixture
    Expected: HTML has audit block and no canaries
    Evidence: .omo/evidence/task-11-gui-sensitive.html
  ```

  **Commit**: YES | Message: `test(security): harden metis ui redaction` | Files: `test/*`, `lib/*`

- [x] 12. Polish Terminal-First UX

  **What to do**: Perform final UX pass on TUI and GUI preview. TUI should feel operational and dense, not decorative. GUI should be a quiet dashboard with scan summary, evidence, candidates, audit, diff, and rollback ledger. Confirm Metis name appears consistently. Ensure text fits at common terminal widths: 80, 100, 140 columns. Ensure GUI works at desktop and narrow viewports.
  **Must NOT do**: Do not introduce ornate Greek decoration, gradients, or marketing landing page. Do not hide evidence/risk behind vague labels.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 13 | Blocked By: 6, 8, 9, 10, 11

  **References**:
  - Pattern: `E:\Coding Agent\lib\cli\output.js` - concise operational wording.
  - External: `https://github.com/openai/codex` - terminal-first reference.
  - External: `https://hermes-agent.nousresearch.com/docs/user-guide/desktop` - multi-panel GUI reference; use only as inspiration.

  **Acceptance Criteria**:
  - [ ] TUI snapshot/transcript at 80 columns has no broken critical labels.
  - [ ] TUI snapshot/transcript at 140 columns uses detail panel.
  - [ ] GUI desktop screenshot has no overlapping sections.
  - [ ] GUI narrow screenshot stacks sections cleanly.
  - [ ] Metis naming is consistent across help, TUI, GUI, docs, generated scaffold.

  **QA Scenarios**:
  ```text
  Scenario: 80-column TUI
    Tool: bash
    Steps: run scripted TUI with COLUMNS=80
    Expected: essential status, evidence, candidate, audit labels remain readable
    Evidence: .omo/evidence/task-12-tui-80.txt

  Scenario: Desktop and narrow GUI polish
    Tool: Browser or Playwright
    Steps: inspect generated preview at 1440x900 and 390x844
    Expected: no text overlap, no nested-card clutter, no mutation controls
    Evidence: .omo/evidence/task-12-gui-polish.png
  ```

  **Commit**: YES | Message: `polish(ui): refine metis terminal-first surfaces` | Files: `lib/tui/*`, `lib/gui/*`, `README.md`, `test/*`

- [x] 13. Release Validation And Migration Pack

  **What to do**: Create final migration checklist and release notes. Include before/after command mapping: `pca scan` -> `metis scan`, `pca init --dry-run` -> `metis init --dry-run`, `.pca` -> `.metis`. Add release note that `pca` remains alias for one release. Run full verification wave and store evidence.
  **Must NOT do**: Do not mark `pca` removed. Do not claim GUI can mutate.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification | Blocked By: 12

  **References**:
  - Pattern: `E:\Coding Agent\.omo\start-work\ledger.jsonl` - evidence ledger style from previous work.
  - Pattern: `E:\Coding Agent\README.md` - current try-it flow.
  - Pattern: `E:\Coding Agent\docs\PRD.md` - verification command list.

  **Acceptance Criteria**:
  - [ ] Migration guide exists in README or docs.
  - [ ] Release notes include alias and artifact compatibility.
  - [ ] Full verification commands pass.
  - [ ] `.omo/evidence/final-metis-terminal-first.md` summarizes commands, artifacts, and cleanup.

  **QA Scenarios**:
  ```text
  Scenario: Migration command map
    Tool: bash
    Steps: run old pca and new metis scan/plan command pairs on mixed fixture
    Expected: both exit 0 and produce equivalent evidence/candidate counts
    Evidence: .omo/evidence/task-13-migration-map.txt

  Scenario: Final no-leak sweep
    Tool: bash
    Steps: run full smoke matrix against mixed, history, and sensitive fixtures
    Expected: no fake secret/private path/prompt injection canary appears in stdout, stderr, HTML, or transcripts
    Evidence: .omo/evidence/task-13-no-leak.txt
  ```

  **Commit**: YES | Message: `chore(release): add metis migration pack` | Files: `README.md`, `docs/*`, `.omo/evidence/*`

## Final Verification Wave
> ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. Plan Compliance Audit

  **What to do**: Verify every task acceptance criterion has direct evidence.
  **Acceptance Criteria**:
  - [ ] All task evidence files exist or are intentionally summarized in final evidence.
  - [ ] No task left without happy and failure/edge QA.
  - [ ] Scope exclusions were respected.
  **QA Scenarios**:
  ```text
  Scenario: Checklist audit
    Tool: bash
    Steps: inspect .omo/evidence and task results
    Expected: every task has referenced evidence
    Evidence: .omo/evidence/f1-plan-compliance.txt
  ```

- [x] F2. Code Quality Review

  **What to do**: Run syntax, tests, source size checks, and static remote-call checks.
  **Acceptance Criteria**:
  - [ ] `node --check bin/metis.js` passes.
  - [ ] `node --check bin/pca.js` passes.
  - [ ] `find lib -name '*.js' -print -exec node --check {} \;` passes.
  - [ ] `find test -name '*.js' -print -exec node --check {} \;` passes.
  - [ ] `npm test` passes.
  - [ ] every source file remains under 250 pure LOC or is split.
  **QA Scenarios**:
  ```text
  Scenario: Full quality gate
    Tool: bash
    Steps: run syntax checks, npm test, LOC check
    Expected: all pass; max pure LOC reported
    Evidence: .omo/evidence/f2-code-quality.txt
  ```

- [x] F3. Real Manual QA

  **What to do**: Run end-to-end CLI, TUI, GUI preview flows on temp fixtures.
  **Acceptance Criteria**:
  - [ ] Metis CLI scan/plan/init/evolve works.
  - [ ] TUI dry-run transcript works.
  - [ ] TUI apply/rollback restores temp fixture byte-for-byte.
  - [ ] GUI preview opens and renders desktop/narrow screenshots.
  - [ ] temp resources are cleaned.
  **QA Scenarios**:
  ```text
  Scenario: End-to-end Metis local workflow
    Tool: bash + Browser/Playwright
    Steps: run CLI matrix, scripted TUI matrix, generate/open GUI preview
    Expected: all pass, no canaries, cleanup complete
    Evidence: .omo/evidence/f3-real-manual-qa.txt
  ```

- [x] F4. Scope Fidelity Check

  **What to do**: Confirm Metis remains a scaffold manager, not a chat runtime.
  **Acceptance Criteria**:
  - [ ] No chat command introduced.
  - [ ] No cloud/backend/telemetry code introduced.
  - [ ] GUI has no write mutation controls.
  - [ ] TUI apply requires explicit confirmation and audit ok.
  - [ ] docs do not claim full self-evolution.
  **QA Scenarios**:
  ```text
  Scenario: Scope search
    Tool: rg
    Steps: search code/docs for chat/cloud/telemetry/apply-control claims and inspect matches
    Expected: only non-goal or guardrail mentions
    Evidence: .omo/evidence/f4-scope-fidelity.txt
  ```

## Commit Strategy
- Use one commit per task when task files are cohesive.
- Do not mix implementation and docs unless task explicitly says so.
- Keep compatibility and safety tests in the same commit as the behavior they protect.
- Final release/migration notes are the last commit.

## Success Criteria
- Metis is the canonical brand and command.
- Existing `pca` users retain a working alias during transition.
- Core remains local-first and zero runtime dependency.
- TUI is a complete terminal-first workflow surface.
- GUI preview is useful and read-only.
- Apply/rollback safety is not weakened.
- All current and new tests pass.
- Documentation explains exactly what Metis is and is not.
