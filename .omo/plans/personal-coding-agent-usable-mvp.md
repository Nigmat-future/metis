# Work Plan: PCA 可用级 MVP

## Plan Metadata
- Plan status: ready for execution
- Repository: `E:\Coding Agent`
- Current project shape: Node.js 18+ CommonJS CLI, no runtime dependencies
- Current commands: `pca scan`, `pca plan`, `pca init --dry-run`
- Planning mode: brownfield, source-modifying execution plan
- Primary goal: 把当前 README-driven skeleton 推进到一个本地可用、可信、可审计的 Personal Coding Agent scaffold generator

## Objective
交付一个可用级 PCA MVP：

1. 用户在本地运行 `pca scan`，能安全扫描 Claude Code 与 Codex 的配置/项目指令/受控历史证据。
2. 用户运行 `pca plan`，能看到 evidence-backed 的个人 agent 行为候选项，而不是固定文案。
3. 用户运行 `pca init --dry-run`，能看到真实 scaffold diff，目标至少包括 `CLAUDE.md`、`AGENTS.md`、`.cursor/rules/personal-agent.mdc` 和 `.pca/evidence/index.json`。
4. 用户运行 `pca init --apply --yes` 时，只有在 dry-run、安全审计和回滚元数据都通过后才写文件。
5. 用户运行 `pca rollback <id>`，能回滚上一次 apply。
6. 用户运行 `pca evolve --dry-run`，能基于新增证据提出小型变更提案，但不静默自改。
7. 所有核心流程保持 local-first、no network、no telemetry、no raw secret display、no silent transcript reading。

## MVP Definition Of Usable
本计划中的“可用级”不是完整个人 AI agent runtime，而是一个能被重度 AI 编程用户真实试用的本地迁移层。

可用级必须满足：
- Zero account: 不需要账号、云端、API key。
- Zero dependency runtime: 继续保持 package runtime 无依赖；测试可使用 Node 内置能力。
- Zero silent writes: `scan`、`plan`、`init --dry-run`、`evolve --dry-run` 不写目标 scaffold。
- Reviewable output: 所有推荐都有 evidence id、source、confidence、risk、target。
- Safe apply: `init --apply --yes` 才能写文件，写前生成 rollback record。
- Bounded history scan: 默认不读取 transcript content；只有显式 `--include-history` 才读取受控、大小限制、先脱敏的历史片段。
- Token discipline: 生成文件有长度预算、去重、低置信度不固化。

## Non-Goals For This Plan
- 不做聊天 UI。
- 不做新 Coding Agent runtime。
- 不做模型网关。
- 不做云同步。
- 不做团队后台。
- 不做 Cursor 全量语义解析；只生成 Cursor rule scaffold。
- 不自动放宽 hooks、MCP、permissions。
- 不把一次性用户偏好写成长久规则。
- 不把 raw transcript 或 raw command output 写入 `.pca/evidence`。

## Key Decisions
- Keep CommonJS: 继续使用 CommonJS 和 Node 内置模块，避免引入 TypeScript/Babel/ESM 迁移成本。
- Split before growth: 当前 `bin/pca.js` 135 pure LOC，继续增长会逼近 250 LOC；先拆 CLI、core、adapter、planner、generator 模块。
- Scan configs first, history opt-in second: 默认扫描稳定配置源；历史内容读取必须显式 `--include-history`，且先经过 redactor。
- Plan before apply: `pca plan` 与 `pca init --dry-run` 是主要 aha moment；apply 是可选安全能力。
- Evidence over prose: 推荐必须由 structured evidence 驱动；无法解释来源的推荐不生成。
- Metadata is sensitive: 绝对路径、JSON key、MCP server name、hook file name 都按敏感 metadata 处理。
- Proposal-only evolution: `evolve` 只提案，不静默写长期配置。

## Defaults Applied
- CLI language: English command text remains; generated scaffold sections may be English by default, with future localization out of scope.
- File outputs: `init --dry-run` prints unified diffs to stdout; `init --apply --yes` writes only whitelisted paths.
- Root selection: `--fixture <path>` is for deterministic test/demo roots; normal `pca scan` scans `process.cwd()`.
- History scan limit: default `--include-history` reads at most 20 session files per tool, max 64 KiB per file, after path containment and redaction.
- Symlink policy: do not follow symlinks by default; report them as skipped.
- Directory count policy: recursively count regular files under hooks/skills up to max depth 5; skip symlinks and report skipped count.
- Confidence thresholds: high >= 0.80, medium >= 0.55, needs-review < 0.55.

## Scope
IN:
- CLI parsing and command routing hardening.
- Safe filesystem utilities with containment, lstat, explicit statuses, display sanitization.
- Redactor for secrets, private paths, control characters, high-entropy values, internal URLs.
- Evidence schema and in-memory evidence store.
- Claude Code adapter upgrade.
- Codex adapter for `AGENTS.md` hierarchy, `.codex` metadata, and opt-in history inventory.
- Project adapter for commands from `package.json`, common lockfiles, `README`, `Makefile` when present.
- Extractor for repeated rules, commands, hooks, MCP risks, verification habits.
- Planner that turns evidence into candidates.
- Generator for reviewable scaffold diffs.
- Safety auditor before generation/apply.
- Apply and rollback with whitelisted paths.
- `evolve --dry-run` as proposal-only re-scan.
- Tests, fixtures, docs, README/PRD/ARCHITECTURE updates.

OUT:
- Full transcript semantic summarization.
- LLM calls.
- Network calls.
- Hosted profile.
- Team policy management.
- Automatic permissions/hook execution.
- Full plugin SDK.

## Target CLI Contract

General root rule:
- Root-scoped commands accept `--fixture <path>` for deterministic test/demo roots.
- Without `--fixture`, root-scoped commands operate on `process.cwd()`.
- `--fixture` never means "safe to write fixed repository fixtures"; tests must copy fixtures to temp roots before apply/rollback.

### `pca scan`
Purpose: discover safe local evidence.

Supported forms:
```bash
node bin/pca.js scan
node bin/pca.js scan --fixture test/fixtures/claude-code-project
node bin/pca.js scan --include-history
node bin/pca.js scan --json
```

Rules:
- `--fixture` must have a non-flag path value.
- missing fixture path exits 2.
- nonexistent fixture path exits 2.
- file fixture path exits 2.
- symlink fixture path exits 2 unless realpath remains inside allowed root and policy explicitly allows it; MVP default is reject.
- no scaffold writes.
- no history content read unless `--include-history`.
- stdout never contains raw secrets or raw absolute user home paths.

### `pca plan`
Purpose: convert evidence into behavior candidates.

Supported forms:
```bash
node bin/pca.js plan
node bin/pca.js plan --fixture test/fixtures/claude-code-project
node bin/pca.js plan --include-history
node bin/pca.js plan --json
```

Rules:
- no writes.
- no unsupported-source claims.
- each candidate includes evidence ids, confidence, proposed target, risk, and review decision.

### `pca init --dry-run`
Purpose: generate reviewable unified diff.

Supported forms:
```bash
node bin/pca.js init --dry-run
node bin/pca.js init --dry-run --fixture test/fixtures/claude-code-project
node bin/pca.js init --dry-run --include-history
```

Rules:
- writes no target files.
- prints proposed files and unified diffs.
- low-confidence candidates appear only as comments/review notes, not hard rules.
- generation fails closed if safety audit finds high-risk evidence.

### `pca init --apply --yes`
Purpose: apply reviewed scaffold with rollback.

Supported form:
```bash
node bin/pca.js init --apply --yes
node bin/pca.js init --apply --yes --fixture <temp-project-root>
```

Rules:
- `--apply` without `--yes` exits 2 and explains dry-run first.
- writes only whitelisted paths.
- creates `.pca/evidence/index.json`.
- creates `.pca/rollback/<id>.json`.
- refuses to overwrite files with untracked manual content unless a merge plan is generated.

### `pca rollback <id>`
Purpose: restore files from rollback record.

Supported form:
```bash
node bin/pca.js rollback <id>
node bin/pca.js rollback <id> --fixture <temp-project-root>
```

Rules:
- exits 2 if id missing.
- validates rollback record before writes.
- refuses records with paths outside root.
- writes only paths listed in rollback record.

### `pca evolve --dry-run`
Purpose: re-scan and propose incremental changes.

Rules:
- no writes.
- compares current evidence index and current generated sections.
- proposes add/update/delete candidates.
- every change has evidence ids and token impact estimate.

## Target Architecture

```text
bin/pca.js
  -> lib/cli/args.js
  -> lib/cli/commands.js
  -> lib/core/fs-safe.js
  -> lib/core/display.js
  -> lib/core/redactor.js
  -> lib/core/evidence.js
  -> lib/adapters/index.js
  -> lib/adapters/claude-code.js
  -> lib/adapters/codex.js
  -> lib/adapters/project.js
  -> lib/extractor/behavior.js
  -> lib/planner/candidates.js
  -> lib/auditor/safety.js
  -> lib/generator/scaffold.js
  -> lib/applier/apply.js
  -> lib/applier/rollback.js
```

File-size rule:
- No source file may exceed 250 pure LOC.
- Split before adding logic to a file likely to cross 200 pure LOC.
- `bin/pca.js` becomes a tiny entrypoint under 50 pure LOC.

## Evidence Schema

Every evidence record must follow this conceptual shape:

```json
{
  "id": "ev_000001",
  "source": "claude-code",
  "adapter": "claude-code",
  "kind": "instruction-file",
  "rootRelativePath": "CLAUDE.md",
  "displayPath": "CLAUDE.md",
  "status": "present",
  "summary": "Claude Code project instruction file present",
  "confidence": 0.75,
  "sensitivity": "metadata",
  "provenance": {
    "scanRoot": ".",
    "mtimeMs": 0,
    "sizeBytes": 1234
  },
  "signals": ["instructions", "project-rule"],
  "risks": [],
  "redactions": [],
  "contradictions": [],
  "targets": ["CLAUDE.md", "AGENTS.md"]
}
```

Rules:
- `id` is deterministic within one scan run by stable ordering.
- `displayPath` is sanitized and root-relative.
- raw absolute paths do not enter output unless user explicitly requests verbose debug; MVP does not add debug mode.
- raw file content does not enter evidence.
- content-derived evidence stores only redacted excerpts with max 160 chars and only under `--include-history`.

## Candidate Schema

Every planner candidate must follow this conceptual shape:

```json
{
  "id": "cand_000001",
  "title": "Run the smallest relevant test before final claims",
  "body": "Prefer the smallest relevant test command before reporting completion.",
  "confidence": "high",
  "score": 0.86,
  "tokenCostEstimate": 18,
  "evidenceIds": ["ev_000003", "ev_000017"],
  "targets": ["AGENTS.md", "CLAUDE.md"],
  "risk": "low",
  "decision": "generate",
  "reviewReason": ""
}
```

Rules:
- no candidate without evidence ids.
- no generated rule longer than 30 words.
- duplicate candidates collapse into one.
- contradictory candidates become `needs-review`.
- high-risk candidates never become active rules.

## Wave 0: Baseline And Safety Harness

### Task 0.1: Freeze Current Behavior With Tests
Ownership:
- `test/pca-cli.test.js`
- new `test/helpers/fixtures.js`

Steps:
1. Add helper to copy fixture directories into `fs.mkdtempSync()` roots before each test.
2. Replace direct fixture mutation in the no-write test with temp fixture usage.
3. Add baseline tests for current successful commands:
   - `scan --fixture <valid>`
   - `plan --fixture <valid>`
   - `init --dry-run`
   - `init`
4. Add a no-network static assertion:
   - test scans `bin/` and `lib/` source text for `http`, `https`, `net`, `tls`, `fetch(` imports/calls and fails if introduced without an explicit allowlist.

Acceptance criteria:
- `npm test` passes.
- No test deletes or modifies files under `test/fixtures`.
- Tests use temp dirs for any write/no-write assertions.

QA scenarios:
- Happy: fixture copied to temp dir, scan succeeds.
- Failure: test intentionally creates `.pca` in temp fixture, CLI no-write assertion only checks temp path.

### Task 0.2: Add Fixture Matrix
Ownership:
- `test/fixtures/`
- `test/pca-cli.test.js`

Create fixtures:
- `test/fixtures/claude-code-nested-project`
- `test/fixtures/codex-project`
- `test/fixtures/mixed-agent-project`
- `test/fixtures/symlink-project`
- `test/fixtures/sensitive-metadata-project`
- `test/fixtures/history-project`

Fixture content:
- nested Claude hooks/skills directories.
- root `AGENTS.md`.
- nested `services/api/AGENTS.md`.
- fake `.codex/config.toml` or `.codex/config.json` if exact format is unknown; mark as metadata-only shape.
- transcript-like canary files containing fake secrets and prompt injection text.
- symlink pointing outside fixture root where platform supports symlink; skip symlink test on Windows if permission denied.

Acceptance criteria:
- fixtures contain no real secrets.
- sensitive strings use obvious fake canaries:
  - `sk-pca-fake-secret`
  - `internal.customer.example`
  - `C:\Users\VeryPrivateName`
  - `/Users/very-private-name`

QA scenarios:
- Happy: all fixtures listed by tests.
- Failure: sensitive canary appears in command output; test fails.

## Wave 1: CLI Boundary Hardening

### Task 1.1: Extract CLI Args Parser
Ownership:
- new `lib/cli/args.js`
- [bin/pca.js](<E:/Coding Agent/bin/pca.js>)
- `test/pca-cli.test.js`

Steps:
1. Move argument parsing out of `bin/pca.js`.
2. Implement parser for commands:
   - `scan`
   - `plan`
   - `init`
   - `rollback`
   - `evolve`
   - `--help`
3. Parse flags:
   - `--fixture <path>`
   - `--include-history`
   - `--json`
   - `--dry-run`
   - `--apply`
   - `--yes`
4. Reject:
   - unknown flags.
   - flags requiring values with no values.
   - value flags whose next token starts with `--`.
   - mutually exclusive `--dry-run` and `--apply`.
   - `--yes` without `--apply`.

Acceptance criteria:
- `node bin/pca.js scan --fixture` exits 2.
- stdout for invalid args contains no scan output.
- stderr names the exact missing/invalid argument.
- `node bin/pca.js unknown` still exits 2.

QA scenarios:
- Happy: `scan --fixture test/fixtures/claude-code-project` exits 0.
- Failure: `scan --fixture --dry-run` exits 2.
- Failure: `init --dry-run --apply` exits 2.
- Failure: `rollback` exits 2 with missing id.

### Task 1.2: Shrink Entrypoint
Ownership:
- [bin/pca.js](<E:/Coding Agent/bin/pca.js>)
- new `lib/cli/commands.js`

Steps:
1. Make `bin/pca.js` only call `run(process.argv.slice(2), process.cwd())`.
2. Put command dispatch in `lib/cli/commands.js`.
3. Ensure command handlers return `{ exitCode, stdout, stderr }` for testability.
4. Entrypoint prints returned stdout/stderr and sets `process.exitCode`.

Acceptance criteria:
- `bin/pca.js` remains under 50 pure LOC.
- Command handlers can be unit-tested without spawning subprocess.
- Existing subprocess tests still pass.

QA scenarios:
- Happy: subprocess invocation still works.
- Failure: command handler invalid args returns exit 2 without throwing.

## Wave 2: Safe Filesystem And Display Layer

### Task 2.1: Add Safe FS Utilities
Ownership:
- new `lib/core/fs-safe.js`
- `lib/adapters/claude-code.js`
- tests

Functions:
- `resolveScanRoot(inputPath, cwd)`
- `safeLstat(root, relativePath)`
- `safeReadTextFile(root, relativePath, maxBytes)`
- `safeReadJsonShape(root, relativePath, options)`
- `safeListFiles(root, relativePath, options)`

Rules:
- Use `lstatSync` before `statSync`.
- Do not follow symlinks.
- Convert all paths to root-relative display paths.
- Enforce realpath containment for scan root.
- Report statuses:
  - `missing`
  - `present`
  - `not-file`
  - `not-directory`
  - `symlink-skipped`
  - `inaccessible`
  - `too-large`
  - `parse-failed`
  - `outside-root`

Acceptance criteria:
- symlink JSON fixture is reported as `symlink-skipped`.
- symlink outside root is not read.
- inaccessible path reports `inaccessible` where platform allows permission simulation.
- too-large JSON still skipped deterministically.

QA scenarios:
- Happy: regular `.claude/settings.json` parsed by shape only.
- Failure: symlinked `.claude/settings.json` not read.
- Failure: malformed JSON returns parse-failed without raw content.

### Task 2.2: Add Display Sanitizer
Ownership:
- new `lib/core/display.js`
- CLI output paths
- tests

Functions:
- `sanitizeDisplayText(value)`
- `sanitizeDisplayPath(root, absolutePath)`
- `sanitizeJsonKey(key)`
- `formatFinding(finding)`

Rules:
- Strip ANSI/control characters except newline used by program layout.
- Limit display strings to 120 characters.
- Mask home-like path segments:
  - `C:\Users\<name>` -> `~`
  - `/Users/<name>` -> `~`
  - `/home/<name>` -> `~`
- Secret-like keys render as `[redacted-key]`.
- JSON top-level keys are displayed only after sanitization.

Acceptance criteria:
- sensitive metadata fixture output does not contain:
  - fake private username
  - fake internal domain
  - ANSI escape sequences
  - secret-like key names
- output remains readable.

QA scenarios:
- Happy: `permissions, mcpServers` still display.
- Failure: `sk-pca-fake-secret` key is replaced.
- Failure: path containing private user name is masked.

## Wave 3: Redactor And Evidence Model

### Task 3.1: Implement Redactor
Ownership:
- new `lib/core/redactor.js`
- tests

Redaction patterns:
- API-key-like values:
  - `sk-...`
  - `sk-ant-...`
  - `ghp_...`
  - `xoxb-...`
- assignment-like secrets:
  - `TOKEN=...`
  - `API_KEY=...`
  - `SECRET=...`
  - `PASSWORD=...`
- private URLs:
  - `https://internal...`
  - `.corp`
  - `.local`
- private paths:
  - Windows user home
  - macOS/Linux user home
- high-entropy strings over 32 chars.
- prompt injection markers:
  - `ignore previous instructions`
  - `system prompt`
  - `developer message`
  - `exfiltrate`

Rules:
- Redactor returns `{ text, redactions }`.
- Redaction metadata stores type and count, not raw value.
- Redactor is applied before any content-derived evidence is displayed or persisted.

Acceptance criteria:
- all canary secrets redacted.
- redaction count appears in evidence summary.
- redactor does not over-redact ordinary command names like `npm test`.

QA scenarios:
- Happy: `Run npm test before final answer` remains readable.
- Failure: `ANTHROPIC_API_KEY=sk-pca-fake-secret` becomes `[redacted:api-key]`.

### Task 3.2: Implement Evidence Builder
Ownership:
- new `lib/core/evidence.js`
- adapters
- tests

Functions:
- `createEvidenceBuilder(scanContext)`
- `addEvidence(partial)`
- `normalizeEvidence(evidence)`
- `sortEvidence(evidenceList)`
- `summarizeEvidence(evidenceList)`

Rules:
- deterministic ids based on sorted evidence order.
- required fields validated in code.
- no raw absolute path in output.
- evidence can be serialized to JSON.

Acceptance criteria:
- evidence ids stable across repeated scans of same fixture.
- invalid evidence missing `source` or `kind` throws typed error in tests.
- JSON output is deterministic.

QA scenarios:
- Happy: same fixture twice produces same evidence JSON.
- Failure: adapter attempts raw absolute path; builder sanitizes or rejects.

## Wave 4: Adapter Refactor And Claude Code Upgrade

### Task 4.1: Create Adapter Registry
Ownership:
- new `lib/adapters/index.js`
- existing `lib/adapters/claude-code.js`

Contract:
```js
{
  name: 'Claude Code',
  id: 'claude-code',
  scan(context) => Evidence[]
}
```

Rules:
- each adapter receives shared `fs`, `redactor`, `evidenceBuilder`, and `options`.
- adapters do not print.
- adapters do not read outside root.
- adapter errors become evidence warnings, not uncaught crashes, unless scan root invalid.

Acceptance criteria:
- CLI uses registry, not direct `scanClaudeCode` import.
- `scan` output still includes Claude Code findings.

QA scenarios:
- Happy: registry with Claude adapter returns evidence.
- Failure: adapter throws; command returns safe diagnostic and exit 1 only if non-recoverable.

### Task 4.2: Upgrade Claude Code Adapter
Ownership:
- `lib/adapters/claude-code.js`
- tests

Sources:
- `CLAUDE.md`
- `.claude/settings.json`
- `.claude/mcp.json`
- `.claude/hooks/**`
- `.claude/skills/**`
- optional history metadata under known Claude locations only when provided by fixture or explicit root; no hard-coded home scan in first pass.

Rules:
- instruction file presence is metadata by default.
- settings/mcp JSON reads top-level shape only.
- hooks/skills recursively count regular files up to depth 5.
- symlinks skipped and counted.
- command/hook content not executed.
- content not read unless `--include-history`; hooks/skills content remains count-only in MVP.

Acceptance criteria:
- nested hooks/skills fixture reports correct recursive regular file count.
- skipped symlink count appears.
- settings key output sanitized.
- no raw config values printed.

QA scenarios:
- Happy: fixture with 2 nested skill files reports `2 skill file(s)`.
- Failure: symlinked skill skipped.
- Failure: malicious JSON key redacted.

## Wave 5: Codex And Project Evidence

### Task 5.1: Implement Codex Adapter
Ownership:
- new `lib/adapters/codex.js`
- tests
- docs

Sources:
- `AGENTS.md` in scan root.
- nested `AGENTS.md` files up to max depth 5.
- `.codex/config.toml` or `.codex/config.json` if present.
- `.codex/sessions/**` metadata inventory only by default.
- `~/.codex` is not scanned automatically in MVP; user can pass a fixture/root pointing to exported or copied Codex data.

Rules:
- AGENTS.md content is not displayed raw by `scan`.
- `plan` may derive redacted rule candidates from AGENTS.md content because AGENTS.md is an explicit instruction file in project root; apply redactor before extraction.
- session files are counted by default but content not read.
- `--include-history` may read bounded session snippets only through redactor, max 64 KiB per file, max 20 files.
- unsupported formats become evidence warnings.

Acceptance criteria:
- root and nested `AGENTS.md` detected.
- precedence/depth recorded in evidence.
- session inventory count appears without content.
- `--include-history` can extract redacted repeated preference canaries from fixture.

QA scenarios:
- Happy: root `AGENTS.md` says "Always respond in Chinese"; planner candidate targets `AGENTS.md`.
- Failure: session canary secret never appears.
- Failure: unknown `.codex` file reports unsupported.

### Task 5.2: Implement Project Adapter
Ownership:
- new `lib/adapters/project.js`
- tests

Sources:
- `package.json`
- `Makefile`
- `README.md`
- `docs/`
- lockfiles:
  - `package-lock.json`
  - `pnpm-lock.yaml`
  - `yarn.lock`

Rules:
- parse `package.json` with bounded JSON shape and selected safe values:
  - scripts keys
  - package manager inference
  - engines.node
- README/docs content not displayed raw by scan.
- command candidates only include common script names and values after command sanitizer.

Acceptance criteria:
- current project produces evidence for `npm test`.
- planner can recommend verification command from `package.json`.

QA scenarios:
- Happy: `scripts.test = node --test` becomes verification evidence.
- Failure: script containing secret-like token is redacted and marked risk.

## Wave 6: Behavior Extractor And Planner

### Task 6.1: Implement Behavior Extractor
Ownership:
- new `lib/extractor/behavior.js`
- tests

Extracted signal types:
- `verification-command`
- `build-command`
- `lint-command`
- `instruction-rule`
- `language-preference`
- `privacy-rule`
- `tool-permission`
- `mcp-usage`
- `hook-workflow`
- `risk`
- `contradiction`

Rules:
- deterministic rules before text heuristics.
- instruction rules from AGENTS/CLAUDE content only after redaction.
- repeated rules get higher confidence.
- conflicting rules become contradiction evidence.
- unsupported history-derived content is `needs-review`.

Acceptance criteria:
- current fixture yields candidates matching existing README examples.
- Codex fixture yields at least one AGENTS-derived candidate.
- project adapter yields verification command candidate.

QA scenarios:
- Happy: package script `test` recommends `npm test`.
- Happy: AGENTS instruction "Always respond in Chinese" becomes language-preference candidate.
- Failure: one-off history statement becomes needs-review, not generate.

### Task 6.2: Implement Candidate Planner
Ownership:
- new `lib/planner/candidates.js`
- tests

Scoring formula:
- base confidence from source type:
  - explicit config/instruction file: 0.75
  - repeated command evidence: 0.85
  - history content opt-in: 0.55
  - unsupported metadata: 0.25
- +0.10 if repeated across tools.
- +0.05 if repeated across projects/roots.
- -0.20 if contradiction exists.
- -0.30 if safety risk exists.

Decision rules:
- score >= 0.80 and risk low -> `generate`
- 0.55 <= score < 0.80 -> `needs-review`
- score < 0.55 -> `document-only`
- risk high -> `block`

Acceptance criteria:
- no candidate generated without evidence ids.
- candidate list stable across repeated runs.
- contradictions shown in plan output.

QA scenarios:
- Happy: repeated test command becomes high confidence.
- Failure: hook with broad permission becomes needs-review or block.

## Wave 7: Safety Auditor

### Task 7.1: Implement Safety Audit
Ownership:
- new `lib/auditor/safety.js`
- tests

Checks:
- raw secret leakage in evidence/candidates/generated output.
- private absolute path leakage.
- prompt injection text in generated rules.
- destructive shell commands in hooks/commands:
  - `rm -rf`
  - `del /s`
  - `Remove-Item -Recurse`
  - `git reset --hard`
  - broad chmod/chown
- MCP permission breadth:
  - filesystem root access
  - shell command server
  - network fetch server
- oversized generated documents.
- low-confidence candidates becoming active rules.

Rules:
- high risk blocks generation/apply.
- medium risk appears in review notes.
- audit report included in `plan` and `init --dry-run`.

Acceptance criteria:
- malicious fixture blocks `init --dry-run` active generation but still reports safe review notes.
- no audit issue contains raw secret.

QA scenarios:
- Happy: normal fixture passes audit.
- Failure: prompt injection canary is blocked.
- Failure: dangerous hook command marked high risk.

## Wave 8: Generator And Dry-Run Diff

### Task 8.1: Implement Scaffold Generator
Ownership:
- new `lib/generator/scaffold.js`
- tests

Targets:
- `CLAUDE.md`
- `AGENTS.md`
- `.cursor/rules/personal-agent.mdc`
- `.pca/evidence/index.json`

Generated sections:
- PCA managed header.
- concise behavior rules.
- verification commands.
- privacy/safety rules.
- tool-specific notes.
- review-only candidates commented out or separated.

Token/length budgets:
- `CLAUDE.md` generated PCA section <= 80 lines.
- `AGENTS.md` generated PCA section <= 80 lines.
- Cursor rule <= 120 lines.
- each active rule <= 30 words.
- no more than 12 active rules per target.

Rules:
- preserve existing manual content.
- write generated section between markers:
  - `<!-- PCA:BEGIN -->`
  - `<!-- PCA:END -->`
- dry-run produces unified diff only.
- no target file writes in dry-run.

Acceptance criteria:
- `pca init --dry-run --fixture mixed-agent-project` prints diffs for all targets.
- existing content outside PCA markers preserved in diff.
- generated evidence JSON contains no raw secrets.

QA scenarios:
- Happy: no existing target files -> diff shows new files.
- Happy: existing AGENTS.md with manual section -> diff inserts PCA section only.
- Failure: audit block -> no active scaffold diff, only blocked report.

### Task 8.2: Make `plan` Evidence-Backed
Ownership:
- `lib/cli/commands.js`
- `lib/planner/candidates.js`
- tests

Output shape:
```text
Extracted behavior candidates:

  [high confidence] Run npm test before final answer
    Evidence: ev_000003 package.json scripts.test
    Proposed target: AGENTS.md, CLAUDE.md
    Risk: low
    Decision: generate
```

Rules:
- text output stays readable.
- `--json` outputs stable machine-readable evidence/candidates/audit.
- no writes.

Acceptance criteria:
- current README examples updated to match real dynamic output.
- `plan` no longer hardcodes only Claude presence findings.

QA scenarios:
- Happy: no findings -> explicit "No supported evidence found".
- Happy: mixed fixture -> multiple candidates with evidence ids.

## Wave 9: Apply And Rollback

### Task 9.1: Implement Apply
Ownership:
- new `lib/applier/apply.js`
- `lib/cli/commands.js`
- tests

Rules:
- only `init --apply --yes` writes.
- writes only whitelisted paths:
  - `CLAUDE.md`
  - `AGENTS.md`
  - `.cursor/rules/personal-agent.mdc`
  - `.pca/evidence/index.json`
  - `.pca/rollback/<id>.json`
- refuses paths outside root after realpath containment.
- creates parent directories as needed.
- refuses if safety audit has high-risk issue.
- generates rollback record before writing.
- rollback record stores previous file content or missing status.

Acceptance criteria:
- apply writes expected files in temp fixture only.
- apply without `--yes` exits 2.
- apply with high-risk fixture exits 1 and writes nothing.

QA scenarios:
- Happy: clean temp project apply creates targets and rollback record.
- Failure: existing manual target with no PCA markers causes merge review refusal unless generator can preserve content.
- Failure: malicious target path outside root refused.

### Task 9.2: Implement Rollback
Ownership:
- new `lib/applier/rollback.js`
- tests

Rules:
- `rollback <id>` reads `.pca/rollback/<id>.json`.
- validates schema.
- validates all paths stay inside root.
- restores previous contents.
- deletes files that were absent before apply.
- writes rollback completion marker in stdout.

Acceptance criteria:
- apply then rollback restores exact prior files in temp fixture.
- rollback missing id exits 2.
- rollback malformed record exits 1 and writes nothing.

QA scenarios:
- Happy: generated AGENTS.md removed if absent before apply.
- Happy: existing CLAUDE.md restored byte-for-byte.
- Failure: rollback record with outside path refused.

## Wave 10: Proposal-Only Evolution

### Task 10.1: Implement `evolve --dry-run`
Ownership:
- `lib/cli/commands.js`
- new `lib/planner/evolve.js`
- tests

Behavior:
- reads current `.pca/evidence/index.json` if present.
- re-runs scan with current options.
- compares old evidence/candidates to new evidence/candidates.
- proposes:
  - add rule
  - update rule
  - delete stale rule
  - downgrade to review-only
- prints token impact estimate:
  - added words
  - removed words
  - net active rule count

Rules:
- no writes in `--dry-run`.
- `evolve` without `--dry-run` exits 2 in MVP.
- no low-confidence automatic promotion.

Acceptance criteria:
- evolve fixture with new repeated command proposes add.
- evolve fixture with stale rule proposes delete/review.
- no files changed.

QA scenarios:
- Happy: evidence index absent -> instruct user to run `init --apply --yes` after dry-run review.
- Happy: evidence changed -> proposal printed.
- Failure: high-risk new evidence blocked.

## Wave 11: Documentation And Product Surface

### Task 11.1: Update README
Ownership:
- [README.md](<E:/Coding Agent/README.md>)

Required updates:
- clarify current MVP supports Claude + Codex + project evidence.
- show real command outputs from fixtures.
- show dry-run diff example.
- explain `--include-history`.
- explain privacy boundary:
  - default no transcript content reads.
  - history opt-in is bounded and redacted.
  - no network.
  - apply requires `--yes`.
- add "What usable means" section.

Acceptance criteria:
- README commands match implemented behavior.
- no claim says "self-evolving" without "proposal-only".

### Task 11.2: Update PRD And Architecture
Ownership:
- [docs/PRD.md](<E:/Coding Agent/docs/PRD.md>)
- [docs/ARCHITECTURE.md](<E:/Coding Agent/docs/ARCHITECTURE.md>)
- [SECURITY.md](<E:/Coding Agent/SECURITY.md>)
- [CONTRIBUTING.md](<E:/Coding Agent/CONTRIBUTING.md>)

Required updates:
- PRD MVP scope moves from skeleton to usable MVP.
- architecture includes adapter registry, redactor, evidence, generator, apply/rollback.
- security documents metadata sensitivity and symlink policy.
- contributing documents fixture isolation and no-network static test.

Acceptance criteria:
- docs do not overpromise full transcript understanding.
- docs mention exact safety limits and opt-in history behavior.

## Final Verification Wave

### Required Commands
Run from `E:\Coding Agent`:

```bash
node --check bin/pca.js
find lib -name '*.js' -print -exec node --check {} \;
find test -name '*.js' -print -exec node --check {} \;
npm test
node bin/pca.js scan --fixture test/fixtures/claude-code-project
node bin/pca.js scan --fixture
node bin/pca.js scan --fixture --dry-run
node bin/pca.js plan --fixture test/fixtures/mixed-agent-project
node bin/pca.js plan --fixture test/fixtures/mixed-agent-project --json
node bin/pca.js init --dry-run --fixture test/fixtures/mixed-agent-project
node bin/pca.js init --apply
TEMP_ROOT="$(mktemp -d)"
cp -R test/fixtures/mixed-agent-project/. "$TEMP_ROOT/"
node bin/pca.js init --apply --yes --fixture "$TEMP_ROOT"
ROLLBACK_ID="<the rollback id printed by the apply command above>"
node bin/pca.js rollback "$ROLLBACK_ID" --fixture "$TEMP_ROOT"
node bin/pca.js evolve --dry-run --fixture test/fixtures/mixed-agent-project
```

Expected:
- syntax checks pass.
- `npm test` passes.
- invalid arg commands exit 2 and do not scan.
- dry-run commands write no target scaffold.
- apply writes only in temp fixture during tests.
- rollback restores exact previous state.
- no output contains fake secret canaries.
- no output contains raw private path canaries.

### Manual QA Scenarios
1. Fresh project with no agent files:
   - `scan` reports no supported evidence.
   - `plan` explains no candidates.
   - `init --dry-run` proposes minimal scaffold or no-op with clear reason.
2. Claude-only project:
   - detects Claude files.
   - produces CLAUDE/AGENTS bridge candidates.
   - never prints raw settings values.
3. Codex-only project:
   - detects root and nested AGENTS.md.
   - respects deeper AGENTS precedence in evidence.
   - generates AGENTS target without duplicating rules.
4. Mixed project:
   - extracts repeated verification command.
   - dedupes overlapping Claude/Codex rules.
   - generates concise diff.
5. Sensitive project:
   - redacts canaries.
   - blocks prompt injection.
   - warns on dangerous hooks/MCP.
6. Apply/rollback project:
   - apply creates rollback.
   - rollback restores byte-for-byte.

### Security Review Checklist
- No network imports/calls.
- No telemetry.
- No hook execution.
- No raw transcript persistence.
- No symlink traversal.
- No writes outside whitelist.
- No raw secrets in stdout/stderr/evidence/generated files.
- No absolute private home paths in normal output.
- No high-risk candidate becomes active generated rule.

### Code Quality Checklist
- every source file <= 250 pure LOC.
- no duplicated adapter filesystem logic.
- all scan statuses explicit.
- CLI parser tests cover invalid combinations.
- generator preserves manual content outside PCA markers.
- JSON output stable and deterministic.

## Implementation Order
Execute waves in order. Do not start Wave 5 before Waves 1-3 pass, because Codex/history scanning would otherwise inherit unsafe argument, path, and redaction behavior.

Recommended execution grouping:
1. Waves 0-2: safety foundation.
2. Waves 3-4: evidence model and Claude upgrade.
3. Wave 5: Codex/project evidence.
4. Waves 6-8: useful plan and dry-run diff.
5. Waves 9-10: apply/rollback and proposal-only evolve.
6. Wave 11 + final verification.

## Risks And Mitigations
- Risk: scope creep into full transcript intelligence.
  - Mitigation: default metadata-only; `--include-history` bounded and redacted.
- Risk: privacy breach through metadata.
  - Mitigation: display sanitizer, path masking, key redaction, tests with canaries.
- Risk: generated config grows too large.
  - Mitigation: rule count, line count, token estimate budgets.
- Risk: unsafe apply overwrites manual files.
  - Mitigation: PCA markers, rollback, path whitelist, manual content preservation.
- Risk: future adapters duplicate unsafe patterns.
  - Mitigation: shared fs-safe, redactor, evidence builder, adapter registry.

## Exit Criteria
The plan is complete when:
- all waves are implemented.
- all verification commands pass.
- README demo can be run by a new user in under 3 minutes.
- `pca plan` output contains dynamic evidence-backed candidates from at least Claude, Codex, and project command fixtures.
- `pca init --dry-run` produces real scaffold diffs without writing.
- `pca init --apply --yes` and `pca rollback <id>` work in temp-project tests.
- `pca evolve --dry-run` proposes changes without writing.
- no known P1/P2 privacy or path-boundary findings remain.
