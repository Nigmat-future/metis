# Personal Metis Product Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition Metis as a quiet, personal, local-first rule companion while adding a rule-quality review layer, a decision-first GUI, clearer first-run language, and demo material.

**Architecture:** Keep the zero-dependency CommonJS runtime. Add a small `lib/planner/rule-quality.js` analyzer, attach its output to the existing workflow pipeline, surface it through CLI/GUI view models, and keep all GUI controls read-only. Documentation and demo updates stay static and local.

**Tech Stack:** Node.js 18+ CommonJS, `node:test`, static HTML/CSS/JS, existing CLI/TUI/GUI workflows.

---

## Product Direction

Metis should feel like a personal rule companion, not a stuffed agent runtime. The user experience should be calm, private, and reviewable:

- It turns repeated AI-coding corrections into local rules.
- It keeps rules short, personal, evidence-backed, and reversible.
- It reveals complexity progressively: conclusion first, evidence later.
- It avoids Claude-Code-like feature bulk: no model calls, no cloud memory, no automatic self-evolution, no GUI mutation controls.

## File Structure

- Modify `README.md`: rewrite opening narrative, before/after section, first-run path, demo pointer.
- Modify `docs/PRD.md`: align product story and non-goals with the personal companion direction.
- Modify `docs/PRODUCT-GRADE.md`: document rule quality output and GUI decision-first policy.
- Create `docs/DEMO.md`: real-project demo script and recording guidance.
- Create `docs/assets/metis-demo.svg`: dependency-free animated terminal-style demo asset.
- Modify `test/check-docs.test.js`: assert README opening has pain, before/after, personal/local language, and avoids first-screen command dumping.
- Create `test/rule-quality.test.js`: direct tests for quality analyzer.
- Modify `test/behavior-contract.test.js`: assert workflow candidates include quality metadata and CLI plan prints quality summary.
- Modify `test/metis-gui.test.js`: assert Review Room information architecture and read-only controls.
- Modify `scripts/check-docs.js`: add product narrative consistency checks.
- Modify `scripts/product-qa.js`: assert generated GUI contains the Review Room, quality summary, and personal/local copy.
- Create `lib/planner/rule-quality.js`: quality analyzer for concise, personal, non-conflicting rules.
- Modify `lib/planner/candidates.js`: attach per-candidate quality metadata.
- Modify `lib/workflows/index.js`: include pipeline-level `ruleQuality`.
- Modify `lib/cli/output.js`: print a small quality summary after candidate plan.
- Modify `lib/ui/view-model.js`: add decision summary, personal rule summary, and rule quality rows.
- Modify `lib/gui/preview.js`: restructure static HTML into a decision-first Review Room.
- Modify `lib/gui/dashboard-script.js`: keep filtering/details working with renamed user-facing labels.
- Modify `lib/tui/renderer.js`: soften first-run copy from "candidates/evidence" toward "suggested rules/why".

---

### Task 1: README And Product Narrative

**Files:**
- Modify: `README.md`
- Modify: `docs/PRD.md`
- Modify: `docs/PRODUCT-GRADE.md`
- Modify: `scripts/check-docs.js`
- Test: `test/check-docs.test.js`

- [ ] **Step 1: Write failing README narrative tests**

Add this test to `test/check-docs.test.js`:

```js
test('README opens with personal local product narrative before command flow', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const firstSixty = readme.split(/\r?\n/).slice(0, 60).join('\n');

  assert.match(firstSixty, /repeated AI coding corrections/i);
  assert.match(firstSixty, /Before/i);
  assert.match(firstSixty, /After/i);
  assert.match(firstSixty, /personal/i);
  assert.match(firstSixty, /local/i);
  assert.match(firstSixty, /reviewable/i);
  assert.match(firstSixty, /reversible/i);

  const firstCommand = firstSixty.search(/node bin\/metis\.js|metis (doctor|scan|plan|init|tui)/i);
  const firstStory = firstSixty.search(/repeated AI coding corrections/i);
  assert.ok(firstStory !== -1);
  assert.ok(firstCommand === -1 || firstCommand > firstStory);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test test/check-docs.test.js
```

Expected: FAIL because the current README opens with the existing "Your AI coding history is your config" positioning and command table before the requested before/after story.

- [ ] **Step 3: Add doc consistency guard**

Extend `scripts/check-docs.js` with a `checkReadmeNarrative(root)` function. Use existing script style and call it from `main()`.

```js
function checkReadmeNarrative(root) {
  const readmePath = path.join(root, 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');
  const firstSixty = readme.split(/\r?\n/).slice(0, 60).join('\n');
  const required = [
    /repeated AI coding corrections/i,
    /Before/i,
    /After/i,
    /personal/i,
    /local/i,
    /reviewable/i,
    /reversible/i,
  ];
  for (const pattern of required) {
    if (!pattern.test(firstSixty)) {
      fail(`README opening is missing product narrative marker: ${pattern}`);
    }
  }
}
```

If `scripts/check-docs.js` uses a different error helper name than `fail`, use the existing helper and keep the message exact enough for tests.

- [ ] **Step 4: Rewrite README opening**

Replace the first roughly 60 lines of `README.md` with this structure:

```markdown
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
```

Then continue into a renamed `## First Run` section with the existing command flow.

- [ ] **Step 5: Align PRD and product-grade docs**

In `docs/PRD.md`, update `Summary` to include:

```markdown
Metis is deliberately personal and small: it helps developers preserve their own
AI-coding working style without becoming a chat runtime, cloud memory system, or
feature-heavy agent shell.
```

In `docs/PRODUCT-GRADE.md`, add to `Product Promise`:

```markdown
Product tone: calm, personal, local, and review-first. New surfaces must reveal
the decision first and hide raw evidence until the user asks for detail.
```

- [ ] **Step 6: Run tests**

Run:

```bash
npm test test/check-docs.test.js
npm run check:docs
```

Expected: PASS.

---

### Task 2: Rule Quality And Conflict Review

**Files:**
- Create: `lib/planner/rule-quality.js`
- Modify: `lib/planner/candidates.js`
- Modify: `lib/workflows/index.js`
- Modify: `lib/cli/output.js`
- Test: `test/rule-quality.test.js`
- Test: `test/behavior-contract.test.js`

- [ ] **Step 1: Write failing direct tests**

Create `test/rule-quality.test.js`:

```js
const assert = require('node:assert');
const { test } = require('node:test');
const { assessRuleQuality } = require('../lib/planner/rule-quality');

function candidate(id, title, body, decision = 'generate') {
  return {
    id,
    title,
    body,
    decision,
    evidenceIds: ['ev_000001'],
    risk: 'low',
    targets: ['AGENTS.md'],
    tokenCostEstimate: body.split(/\s+/).filter(Boolean).length,
  };
}

test('rule quality flags vague overstuffed and impersonal rules', () => {
  const result = assessRuleQuality([
    candidate(
      'cand_000001',
      'Use best practices properly',
      'You are an autonomous coding agent and must always use appropriate best practices properly for everything in this repository',
    ),
  ]);

  assert.strictEqual(result.summary.total, 1);
  assert.strictEqual(result.summary.pass, 0);
  assert.strictEqual(result.summary.needsReview, 1);
  assert.match(result.items[0].issues.join(' '), /vague/i);
  assert.match(result.items[0].issues.join(' '), /overstuffed/i);
  assert.match(result.items[0].issues.join(' '), /impersonal/i);
});

test('rule quality flags duplicates and contradictions without blocking generation globally', () => {
  const result = assessRuleQuality([
    candidate('cand_000001', 'Run npm test before final answer', 'Run npm test before final answer.'),
    candidate('cand_000002', 'Run npm test before final answer', 'Run npm test before final answer.'),
    candidate('cand_000003', 'Do not run npm test before final answer', 'Do not run npm test before final answer.', 'needs-review'),
  ]);

  assert.strictEqual(result.summary.total, 3);
  assert.ok(result.summary.needsReview >= 2);
  assert.ok(result.items.some((item) => item.issues.some((issue) => /duplicate/i.test(issue))));
  assert.ok(result.items.some((item) => item.issues.some((issue) => /conflict/i.test(issue))));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test test/rule-quality.test.js
```

Expected: FAIL with module not found for `../lib/planner/rule-quality`.

- [ ] **Step 3: Implement quality analyzer**

Create `lib/planner/rule-quality.js`:

```js
const VAGUE_TERMS = /\b(best practices?|properly|appropriately|as needed|when possible|etc\.?|things?|stuff|clean code)\b/i;
const IMPERSONAL_TERMS = /\b(you are|system prompt|chain of thought|autonomous agent|tool list|must always|never ever)\b/i;

function assessRuleQuality(candidates) {
  const rows = Array.isArray(candidates) ? candidates : [];
  const normalized = rows.map((candidate) => normalize(`${candidate.title} ${candidate.body}`));
  const items = rows.map((candidate, index) => {
    const issues = [];
    const text = `${candidate.title} ${candidate.body}`;
    const words = String(candidate.body || '').split(/\s+/).filter(Boolean);
    if (words.length > 24) issues.push('overstuffed: keep personal rules under 24 words');
    if (VAGUE_TERMS.test(text)) issues.push('vague: use concrete, verifiable wording');
    if (IMPERSONAL_TERMS.test(text)) issues.push('impersonal: rule sounds like a system prompt, not a personal habit');
    if (normalized.filter((value) => value === normalized[index]).length > 1) issues.push('duplicate: same rule appears more than once');
    if (hasConflict(normalized[index], normalized)) issues.push('conflict: contradictory rule wording detected');
    return {
      candidateId: candidate.id,
      title: candidate.title,
      status: issues.length ? 'needs-review' : 'pass',
      issues,
    };
  });
  const pass = items.filter((item) => item.status === 'pass').length;
  return {
    summary: {
      total: items.length,
      pass,
      needsReview: items.length - pass,
    },
    items,
  };
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\be?vidence:.*$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasConflict(current, all) {
  if (!current) return false;
  const positive = current.replace(/\b(do not|never|avoid)\b/g, '').trim();
  const negated = /\b(do not|never|avoid)\b/.test(current);
  return all.some((other) => {
    if (other === current) return false;
    const otherNegated = /\b(do not|never|avoid)\b/.test(other);
    const otherPositive = other.replace(/\b(do not|never|avoid)\b/g, '').trim();
    return negated !== otherNegated && positive && otherPositive && positive === otherPositive;
  });
}

module.exports = { assessRuleQuality };
```

- [ ] **Step 4: Run direct tests**

Run:

```bash
npm test test/rule-quality.test.js
```

Expected: PASS.

- [ ] **Step 5: Attach quality metadata to candidates and pipeline**

Modify `lib/planner/candidates.js`:

```js
const { assessRuleQuality } = require('./rule-quality');

function planCandidates(behaviors) {
  const candidates = behaviors.map(toCandidate).sort((a, b) => a.id.localeCompare(b.id));
  const quality = assessRuleQuality(candidates);
  const byId = new Map(quality.items.map((item) => [item.candidateId, item]));
  return candidates.map((candidate) => ({
    ...candidate,
    quality: byId.get(candidate.id) || { status: 'pass', issues: [] },
  }));
}
```

Keep `toCandidate` unchanged except for preserving the existing returned fields.

Modify `lib/workflows/index.js`:

```js
const { assessRuleQuality } = require('../planner/rule-quality');
```

Inside `buildPipeline`, after `candidates`:

```js
const ruleQuality = assessRuleQuality(candidates);
```

Return `ruleQuality` in the pipeline object.

- [ ] **Step 6: Write workflow and CLI tests**

Add to `test/behavior-contract.test.js`:

```js
test('workflow exposes rule quality summary for generated candidates', () => {
  const { buildPipeline } = require('../lib/workflows');
  const pipeline = buildPipeline(fixturePath('mixed-agent-project'));

  assert.ok(pipeline.ruleQuality);
  assert.ok(pipeline.ruleQuality.summary.total > 0);
  assert.strictEqual(pipeline.ruleQuality.items.length, pipeline.candidates.length);
  assert.ok(pipeline.candidates.every((candidate) => candidate.quality));
});

test('plan output prints concise rule quality summary', () => {
  const result = run(['plan', '--fixture', fixturePath('mixed-agent-project')]);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Rule quality:/);
  assert.match(result.stdout, /personal rules pass/i);
});
```

- [ ] **Step 7: Run tests to verify CLI test fails**

Run:

```bash
npm test test/behavior-contract.test.js
```

Expected: FAIL on `Rule quality:` output until `lib/cli/output.js` is updated.

- [ ] **Step 8: Print quality summary in CLI**

Modify `lib/cli/output.js` after candidate loop and before `Safety audit:`:

```js
const quality = pipeline.ruleQuality;
if (quality) {
  lines.push('Rule quality:');
  lines.push(`  ${quality.summary.pass}/${quality.summary.total} personal rules pass`);
  lines.push(`  ${quality.summary.needsReview} need review for length, vagueness, duplication, or conflict`);
  lines.push('');
}
```

- [ ] **Step 9: Run task tests**

Run:

```bash
npm test test/rule-quality.test.js test/behavior-contract.test.js
```

Expected: PASS.

---

### Task 3: GUI Review Room Information Architecture

**Files:**
- Modify: `lib/ui/view-model.js`
- Modify: `lib/gui/preview.js`
- Modify: `lib/gui/dashboard-script.js`
- Test: `test/metis-gui.test.js`

- [ ] **Step 1: Write failing GUI Review Room tests**

Update `test/metis-gui.test.js`, in `gui preview generates read-only HTML sections`, replace title/section assertions with:

```js
assert.match(html, /Metis Review Room/);
assert.match(html, /id="decision"/);
assert.match(html, /Suggested next step/);
assert.match(html, /Private by default/);
assert.match(html, /Personal rule quality/);
assert.match(html, /Suggested Rules/);
assert.match(html, /Why Metis thinks this/);
assert.match(html, /Details for review/);
assert.match(html, /id="rule-quality"/);
```

Keep these existing safety assertions:

```js
assert.match(html, /id="metis-search"/);
assert.match(html, /id="metis-export"/);
assert.match(html, /"schemaVersion":1/);
assert.doesNotMatch(html, /<script[^>]+src=/i);
assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i);
assert.doesNotMatch(html, /data-action=["']apply/i);
assert.doesNotMatch(html, /<button[^>]*apply/i);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test test/metis-gui.test.js
```

Expected: FAIL because GUI still says `Metis Review Dashboard` and lacks `decision` / `rule-quality` sections.

- [ ] **Step 3: Add decision-first view model**

Modify `buildGuiViewModel` in `lib/ui/view-model.js`:

```js
const decision = buildDecisionSummary(tui, generated, pipeline.ruleQuality);
```

Return these new fields:

```js
dashboard: {
  title: 'Metis Review Room',
  subtitle: 'A private local review of the rules that make your coding agents feel like yours.',
  sections: [
    { id: 'decision', label: 'Decision' },
    { id: 'suggested-rules', label: 'Suggested Rules' },
    { id: 'rule-quality', label: 'Rule Quality' },
    { id: 'why', label: 'Why' },
    { id: 'audit', label: 'Safety' },
    { id: 'diff', label: 'Diff' },
    { id: 'details', label: 'Details' },
  ],
},
decision,
ruleQuality: pipeline.ruleQuality || { summary: { total: 0, pass: 0, needsReview: 0 }, items: [] },
```

Add helper:

```js
function buildDecisionSummary(model, generated, ruleQuality) {
  const auditOk = model.summary.auditOk;
  const generatedRules = model.candidates.filter((row) => row.decision === 'generate').length;
  const reviewRules = model.candidates.length - generatedRules;
  const qualityReview = ruleQuality && ruleQuality.summary ? ruleQuality.summary.needsReview : 0;
  const nextStep = !auditOk
    ? 'Review the safety issues before generating rules.'
    : generated && generated.ok
      ? 'Review the suggested rules and diff before applying in the TUI or CLI.'
      : 'Run a dry-run preview before any write.';
  return {
    status: auditOk ? 'Ready for review' : 'Needs safety review',
    nextStep,
    writes: 'No project writes in this preview',
    privacy: 'Private by default: no remote calls, no telemetry, no silent transcript reads.',
    generatedRules,
    reviewRules,
    qualityReview,
  };
}
```

Export helper only if tests need direct access; otherwise keep private.

- [ ] **Step 4: Restructure static HTML**

Modify `lib/gui/preview.js`:

1. Keep `renderPreviewHtml(viewModel)`.
2. Replace the top `overview` section with `decision`.
3. Use human-facing labels while preserving searchable tables below.

Key HTML structure:

```html
<section id="decision" class="decision">
  <p class="eyebrow">Private by default</p>
  <h2>${decision.status}</h2>
  <p class="lede">${decision.nextStep}</p>
  <div class="decision-grid">
    ${decisionCard('Suggested rules', decision.generatedRules)}
    ${decisionCard('Needs your review', decision.reviewRules)}
    ${decisionCard('Quality notes', decision.qualityReview)}
    ${decisionCard('Writes', decision.writes)}
  </div>
  <p class="note">${decision.privacy}</p>
</section>
```

Rename sections:

- `id="suggested-rules"` heading: `Suggested Rules`
- `id="rule-quality"` heading: `Personal rule quality`
- `id="why"` heading: `Why Metis thinks this`
- `id="details"` heading: `Details for review`

Keep a table renderer for details, but move evidence below the decision and rule sections.

- [ ] **Step 5: Add rule quality renderer**

In `lib/gui/preview.js`, add:

```js
function renderRuleQuality(ruleQuality) {
  if (!ruleQuality || !ruleQuality.items.length) return '<p class="note">No rule quality notes yet.</p>';
  const body = ruleQuality.items.map((row) => {
    const issues = row.issues.length ? row.issues.join('; ') : 'clear, short, and personal';
    return `<tr><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(issues)}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>Rule</th><th>Status</th><th>Note</th></tr></thead><tbody>${body}</tbody></table>`;
}
```

- [ ] **Step 6: Keep detail buttons and filters working**

Update `dashboardClientScript()` only if selectors changed. Preserve:

```js
document.querySelectorAll('[data-detail-kind]')
```

and keep `payload.evidence` / `payload.candidates` unchanged so export schema remains stable.

- [ ] **Step 7: Run GUI tests**

Run:

```bash
npm test test/metis-gui.test.js
```

Expected: PASS.

---

### Task 4: Progressive Disclosure In CLI/TUI Copy

**Files:**
- Modify: `lib/ui/view-model.js`
- Modify: `lib/tui/renderer.js`
- Modify: `lib/cli/output.js`
- Test: `test/metis-tui.test.js`
- Test: `test/pca-cli.test.js`

- [ ] **Step 1: Write failing copy tests**

Add to `test/metis-tui.test.js`:

```js
test('TUI welcome uses personal rule language before evidence jargon', () => {
  const { previewWorkflow } = require('../lib/workflows');
  const { buildTuiViewModel, buildWelcomeHints } = require('../lib/ui/view-model');
  const { renderFrame } = require('../lib/tui/renderer');
  const { fixturePath } = require('./helpers/fixtures');
  const { pipeline, generated } = previewWorkflow(fixturePath('mixed-agent-project'));
  const model = buildTuiViewModel(pipeline, generated, { welcome: buildWelcomeHints({ evidenceCount: pipeline.evidence.length }) });

  const frame = renderFrame(model, 'scan-results', { pipeline, generated }, 100);

  assert.match(frame, /Suggested rules/i);
  assert.match(frame, /personal/i);
  assert.doesNotMatch(frame, /behavior candidates/i);
});
```

Add to `test/pca-cli.test.js`:

```js
test('plan output names suggested rules without hiding evidence ids', () => {
  const result = run(['plan', '--fixture', fixturePath('mixed-agent-project')]);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Suggested personal rules/);
  assert.match(result.stdout, /Evidence: ev_/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test test/metis-tui.test.js test/pca-cli.test.js
```

Expected: FAIL on missing `Suggested rules` / `Suggested personal rules` copy.

- [ ] **Step 3: Update welcome hints**

Modify `buildWelcomeHints` in `lib/ui/view-model.js`:

```js
steps: [
  'Review suggested personal rules',
  'Preview the diff before any write',
  'Apply requires exact APPLY METIS after audit passes',
],
```

Also change the `headline` to:

```js
headline: 'Your local rule companion',
```

- [ ] **Step 4: Update TUI renderer labels**

Modify `statusSummary` in `lib/tui/renderer.js`:

```js
const text = `Found ${viewModel.summary.evidenceCount} signals · ${viewModel.summary.candidateCount} suggested rules · ${viewModel.summary.auditOk ? 'audit ok' : 'audit failed'}`;
```

Modify `candidatesPanel` title:

```js
const lines = [paint('MAIN Suggested Rules', 'accent', color), metricLine(viewModel, width), ''];
```

Modify `metricLine`:

```js
return fit(`signals ${viewModel.summary.evidenceCount}   suggested rules ${viewModel.summary.candidateCount}   audit ${viewModel.summary.auditOk ? 'ok' : 'failed'}`, width);
```

- [ ] **Step 5: Update CLI plan heading**

Modify `formatPlan` in `lib/cli/output.js`:

```js
const lines = ['Suggested personal rules:', ''];
```

Keep evidence IDs and target details intact.

- [ ] **Step 6: Run task tests**

Run:

```bash
npm test test/metis-tui.test.js test/pca-cli.test.js
```

Expected: PASS.

---

### Task 5: Real-Project Demo And Recording-Ready Asset

**Files:**
- Create: `docs/DEMO.md`
- Create: `docs/assets/metis-demo.svg`
- Modify: `README.md`
- Modify: `scripts/check-docs.js`
- Test: `test/check-docs.test.js`

- [ ] **Step 1: Write failing demo doc tests**

Add to `test/check-docs.test.js`:

```js
test('demo docs and recording asset are linked from README', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const demo = fs.readFileSync(path.join(repoRoot, 'docs', 'DEMO.md'), 'utf8');
  const svg = fs.readFileSync(path.join(repoRoot, 'docs', 'assets', 'metis-demo.svg'), 'utf8');

  assert.match(readme, /\[Demo\]\(docs\/DEMO\.md\)/);
  assert.match(readme, /docs\/assets\/metis-demo\.svg/);
  assert.match(demo, /Real-project demo/i);
  assert.match(demo, /recording/i);
  assert.match(demo, /fixture/i);
  assert.match(svg, /Metis Review Room/);
  assert.match(svg, /Suggested rules/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test test/check-docs.test.js
```

Expected: FAIL because `docs/DEMO.md` and `docs/assets/metis-demo.svg` do not exist.

- [ ] **Step 3: Add demo documentation**

Create `docs/DEMO.md`:

```markdown
# Real-Project Demo

This demo shows Metis as a private local review room for personal coding-agent
rules. It uses the mixed local fixture because the repository keeps release
evidence deterministic and redacted.

## What The Demo Shows

1. Metis finds local signals from Claude Code, Codex, package scripts, and docs.
2. It proposes short personal rules instead of a large system prompt.
3. It checks rule quality for vagueness, duplication, conflict, and overstuffing.
4. It previews diffs without writing project files.
5. It keeps apply and rollback out of the read-only GUI.

## Run It

```bash
node bin/metis.js doctor --fixture test/fixtures/mixed-agent-project
node bin/metis.js plan --fixture test/fixtures/mixed-agent-project
node bin/metis.js gui --preview --fixture test/fixtures/mixed-agent-project --out .omo/evidence/metis-review-room-demo.html
```

Open `.omo/evidence/metis-review-room-demo.html` to review the static page.

## Recording

The repository includes `docs/assets/metis-demo.svg`, a dependency-free animated
terminal-style asset suitable for README previews. Maintainers who want a GIF can
record the same flow with their preferred screen recorder while running:

```bash
node bin/metis.js tui --fixture test/fixtures/mixed-agent-project
```

Keep recordings redacted. Do not capture private home paths, tokens, internal
hosts, or real project transcripts.
```

- [ ] **Step 4: Add animated SVG demo asset**

Create `docs/assets/metis-demo.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-labelledby="title desc">
  <title id="title">Metis Review Room demo</title>
  <desc id="desc">Animated terminal-style preview showing Metis suggested rules, rule quality, and read-only review.</desc>
  <rect width="960" height="540" fill="#0b1016"/>
  <rect x="48" y="42" width="864" height="456" rx="10" fill="#121820" stroke="#2b3a4d"/>
  <text x="78" y="86" fill="#7ad69d" font-family="Consolas, monospace" font-size="24" font-weight="700">Metis Review Room</text>
  <text x="78" y="122" fill="#c7d1dd" font-family="Consolas, monospace" font-size="16">Private by default · no remote calls · no telemetry</text>
  <g font-family="Consolas, monospace" font-size="18">
    <text x="78" y="178" fill="#e7ecf3">Suggested rules</text>
    <text x="78" y="216" fill="#9aa7b8">✓ Run npm test before final answer</text>
    <text x="78" y="250" fill="#9aa7b8">✓ Respond in Simplified Chinese when instructed</text>
    <text x="78" y="284" fill="#9aa7b8">• Keep scaffolds local and redacted</text>
    <text x="530" y="178" fill="#e7ecf3">Personal rule quality</text>
    <text x="530" y="216" fill="#7ad69d">3 clear</text>
    <text x="530" y="250" fill="#f0c674">7 need review</text>
    <text x="530" y="284" fill="#9aa7b8">No project writes in preview</text>
  </g>
  <rect x="78" y="336" width="744" height="48" rx="6" fill="#0d1117" stroke="#243041"/>
  <text x="98" y="366" fill="#7ad69d" font-family="Consolas, monospace" font-size="16">metis › preview-diff</text>
  <circle cx="846" cy="360" r="8" fill="#7ad69d">
    <animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite"/>
  </circle>
</svg>
```

- [ ] **Step 5: Link demo from README**

Add near the end of the README opening or before `First Run`:

```markdown
## Demo

![Metis Review Room demo](docs/assets/metis-demo.svg)

See [Demo](docs/DEMO.md) for the recording-ready flow.
```

- [ ] **Step 6: Extend doc checker for demo assets**

In `scripts/check-docs.js`, check that `README.md`, `docs/DEMO.md`, and `docs/assets/metis-demo.svg` exist and are linked.

- [ ] **Step 7: Run tests**

Run:

```bash
npm test test/check-docs.test.js
npm run check:docs
```

Expected: PASS.

---

### Task 6: Product QA And Full Verification

**Files:**
- Modify: `scripts/product-qa.js`
- Modify: `.omo/evidence/*` generated by QA commands only
- Test: product QA and full check scripts

- [ ] **Step 1: Add product QA assertions for new product surface**

In `scripts/product-qa.js`, after reading `guiOut`, add:

```js
const guiHtml = fs.readFileSync(guiOut, 'utf8');
assert.match(guiHtml, /Metis Review Room/);
assert.match(guiHtml, /Private by default/);
assert.match(guiHtml, /Suggested Rules/);
assert.match(guiHtml, /Personal rule quality/);
assert.match(guiHtml, /No project writes in this preview/);
assertNoCanaries(guiHtml, guiOut);
```

Replace the existing single `assertNoCanaries(fs.readFileSync(guiOut, 'utf8'), guiOut);` with the snippet above.

- [ ] **Step 2: Run product QA to verify it fails if earlier tasks are incomplete**

Run:

```bash
npm run qa:product
```

Expected before Tasks 1-5 are complete: FAIL on missing Review Room markers.

- [ ] **Step 3: Run targeted tests**

Run:

```bash
npm test test/rule-quality.test.js
npm test test/metis-gui.test.js
npm test test/check-docs.test.js
npm test test/behavior-contract.test.js
npm test test/metis-tui.test.js test/pca-cli.test.js
```

Expected: PASS.

- [ ] **Step 4: Run release gates**

Run:

```bash
npm run check
npm run smoke:install
npm run qa:product
```

Expected:

```text
check: pass
install smoke passed
product QA passed
```

- [ ] **Step 5: Manual review checklist**

Open the generated GUI:

```bash
node bin/metis.js gui --preview --fixture test/fixtures/mixed-agent-project --out .omo/evidence/metis-review-room-demo.html
```

Review:

- The first visible section says `Metis Review Room`.
- The first decision tells the user what to do next.
- `Private by default` is visible before raw evidence.
- `Suggested Rules` appears before raw evidence tables.
- `Personal rule quality` shows pass/review counts and notes.
- There is no GUI apply, rollback, write, or mutate control.
- Detail/export controls remain read-only and redacted.

---

## Self-Review

- Spec coverage: README narrative, Review Room GUI, rule quality/conflict review, progressive disclosure, demo/recording asset, and QA are each covered by at least one task.
- Placeholder scan: no placeholder markers remain.
- Type consistency: `ruleQuality.summary.total/pass/needsReview`, `ruleQuality.items`, `candidate.quality`, and `decision.*` names are consistent across tasks.
- Scope: all changes stay within product narrative, static GUI/TUI copy, planner quality metadata, and QA. No cloud, LLM, dependency, server, or GUI mutation feature is introduced.
