const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { copyFixtureToTemp, fixturePath, snapshotFiles } = require('./helpers/fixtures');
const { createTuiStateMachine, APPLY_CONFIRM_TEXT } = require('../lib/tui/state');
const { getCommandSuggestions } = require('../lib/tui/commands');
const { completeCommand } = require('../lib/tui/completion');
const { createCommandHistory } = require('../lib/tui/history');
const { renderFrame, renderScreenUpdate } = require('../lib/tui/renderer');
const { parseKeyChunk } = require('../lib/tui/terminal-keys');
const { buildTuiViewModel, buildGuiViewModel } = require('../lib/ui/view-model');
const { scanWorkflow, initDryRunWorkflow } = require('../lib/workflows');

const metisCli = path.join(__dirname, '..', 'bin', 'metis.js');
const repoRoot = path.join(__dirname, '..');

function runMetis(args, options = {}) {
  return spawnSync(process.execPath, [metisCli, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
  });
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}

const CANARIES = [
  'sk-pca-fake-secret',
  'ghp_abcdefghijklmnopqrstuvwxyz123456',
  'internal.customer.example',
  'VeryPrivateName',
  'very-private-name',
  'ignore previous instructions',
];

test('TUI state machine blocks apply before dry-run and audit', () => {
  const applyCalls = [];
  const machine = createTuiStateMachine({
    applyWorkflow: () => {
      applyCalls.push(1);
      return { ok: true };
    },
  });
  const pipeline = scanWorkflow(fixturePath('sensitive-metadata-project'));
  machine.setPipeline(pipeline);
  machine.setGenerated({ ok: false, message: 'blocked' });
  machine.transition('start');
  machine.transition('plan');
  machine.transition('preview-diff');
  assert.notStrictEqual(machine.getState(), 'apply-confirm');
  assert.strictEqual(applyCalls.length, 0);
});

test('TUI state machine requires exact APPLY METIS confirmation', () => {
  const applyCalls = [];
  const applyWorkflow = () => {
    applyCalls.push(1);
    return { ok: true, rollbackId: 'metis-test' };
  };
  const pipeline = scanWorkflow(fixturePath('mixed-agent-project'));
  const generated = initDryRunWorkflow(pipeline);

  const rejectMachine = createTuiStateMachine({ applyWorkflow });
  rejectMachine.setPipeline(pipeline);
  rejectMachine.setGenerated(generated);
  rejectMachine.transition('start');
  rejectMachine.transition('plan');
  rejectMachine.transition('preview-diff');
  rejectMachine.transition('confirm-apply', { text: 'APPLY' });
  assert.strictEqual(applyCalls.length, 0);

  const acceptMachine = createTuiStateMachine({ applyWorkflow });
  acceptMachine.setPipeline(pipeline);
  acceptMachine.setGenerated(generated);
  acceptMachine.transition('start');
  acceptMachine.transition('plan');
  acceptMachine.transition('preview-diff');
  acceptMachine.transition('confirm-apply', { text: APPLY_CONFIRM_TEXT });
  acceptMachine.transition('apply');
  assert.strictEqual(applyCalls.length, 1);
});

test('scripted TUI dry-run exits 0 without writes', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const before = snapshotFiles(root);
  const result = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/dry-run.txt')]);
  assert.strictEqual(result.status, 0, output(result));
  assert.match(result.stdout, /Diff Preview/);
  assert.match(result.stdout, /METIS WORKBENCH/);
  assert.match(result.stdout, /WORKFLOW/);
  assert.match(result.stdout, /metis ›/);
  assert.deepStrictEqual(snapshotFiles(root), before);
});

test('scripted TUI cancel apply writes nothing', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const before = snapshotFiles(root);
  const result = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/cancel-apply.txt')]);
  assert.strictEqual(result.status, 0, output(result));
  assert.match(result.stdout, /Cancelled/);
  assert.deepStrictEqual(snapshotFiles(root), before);
});

test('scripted TUI happy path applies metis artifacts', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const result = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/happy.txt')]);
  assert.strictEqual(result.status, 0, output(result));
  assert.ok(fs.existsSync(path.join(root, '.metis', 'evidence', 'index.json')));
});

test('TUI non-TTY without script exits 2', () => {
  const result = runMetis(['tui', '--fixture', fixturePath('mixed-agent-project')], {
    env: { ...process.env, TERM: 'dumb' },
  });
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /requires an interactive terminal|--script/);
});

test('sensitive fixture view model is redacted', () => {
  const pipeline = scanWorkflow(fixturePath('sensitive-metadata-project'));
  const generated = initDryRunWorkflow(pipeline);
  const model = JSON.stringify(buildTuiViewModel(pipeline, generated));
  for (const canary of CANARIES) assert.doesNotMatch(model, new RegExp(canary, 'i'));
});

test('GUI view model has no write actions', () => {
  const pipeline = scanWorkflow(fixturePath('mixed-agent-project'));
  const generated = initDryRunWorkflow(pipeline);
  const model = buildGuiViewModel(pipeline, generated);
  assert.ok(model.actions.every((action) => action.kind === 'read'));
  assert.ok(!model.actions.some((action) => action.id === 'apply' || action.id === 'rollback'));
});

test('sensitive scripted TUI blocks with audit failure', () => {
  const result = runMetis(['tui', '--fixture', fixturePath('sensitive-metadata-project'), '--script', fixturePath('tui/sensitive.txt')]);
  assert.strictEqual(result.status, 1, output(result));
  assert.match(result.stdout, /Safety audit failed|failed/);
  for (const canary of CANARIES) assert.doesNotMatch(output(result), new RegExp(canary, 'i'));
});

test('Workbench renderer switches main panel by state and shows wide audit detail', () => {
  const pipeline = scanWorkflow(fixturePath('mixed-agent-project'));
  const generated = initDryRunWorkflow(pipeline);
  const model = buildTuiViewModel(pipeline, generated);
  const context = { pipeline, generated };

  const scanFrame = renderFrame(model, 'scan-results', context, 140);
  assert.match(scanFrame, /METIS WORKBENCH/);
  assert.match(scanFrame, /WORKFLOW/);
  assert.match(scanFrame, /MAIN Evidence/);
  assert.match(scanFrame, /DETAIL \/ AUDIT/);
  assert.doesNotMatch(scanFrame, /MAIN Diff Preview/);

  const planFrame = renderFrame(model, 'candidate-plan', context, 140);
  assert.match(planFrame, /MAIN Candidates/);
  assert.doesNotMatch(planFrame, /MAIN Evidence/);

  const diffFrame = renderFrame(model, 'dry-run-diff', context, 140);
  assert.match(diffFrame, /MAIN Diff Preview/);
  assert.match(diffFrame, /metis ›/);
  assert.match(diffFrame, /suggest:/);

  const busyFrame = renderFrame(model, 'dry-run-diff', context, 140, { busy: true, frame: 2 });
  assert.match(busyFrame, /sync \|/);
  assert.match(renderScreenUpdate(busyFrame, false), /^\x1b\[H\x1b\[J/);
});

test('Workbench renderer uses Oracle Green ANSI theme when color is enabled', () => {
  const pipeline = scanWorkflow(fixturePath('mixed-agent-project'));
  const generated = initDryRunWorkflow(pipeline);
  const model = buildTuiViewModel(pipeline, generated);

  const frame = renderFrame(model, 'candidate-plan', { pipeline, generated }, 100, { color: true });

  assert.match(frame, /\x1b\[38;2;122;214;157m/);
  assert.match(frame, /\x1b\[38;2;199;167;106m/);
  assert.match(frame, /\x1b\[0m/);
});

test('Guided shell suggestions, completion, and history are state aware', () => {
  const pipeline = scanWorkflow(fixturePath('mixed-agent-project'));
  const generated = initDryRunWorkflow(pipeline);
  const context = { pipeline, generated };

  assert.deepStrictEqual(getCommandSuggestions('scan-results', context).map((item) => item.name), ['plan', 'rescan', 'run-evolve', 'quit']);
  assert.strictEqual(completeCommand('pre', 'candidate-plan', context), 'preview-diff');
  assert.strictEqual(completeCommand('apply', 'candidate-plan', context), 'apply');
  assert.strictEqual(completeCommand('apply', 'audit-detail', context), null);

  const history = createCommandHistory();
  history.push('plan');
  history.push('preview-diff');
  assert.strictEqual(history.previous(), 'preview-diff');
  assert.strictEqual(history.previous(), 'plan');
  assert.strictEqual(history.next(), 'preview-diff');
  assert.strictEqual(history.next(), '');
});

test('TUI v3 welcome panel appears on first scripted frame', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const result = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/v3-welcome.txt')]);
  assert.strictEqual(result.status, 0, output(result));
  assert.match(result.stdout, /history is your config/);
  assert.match(result.stdout, /\\   \|   \//);
  assert.doesNotMatch(result.stdout, /Welcome to Metis/);
  assert.match(result.stdout, /Next step/);
  assert.match(result.stdout, /\[1\] Review plan/);
  assert.match(result.stdout, /metis doctor/);
});

test('TUI welcome menu select-menu navigates via scripted input', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const result = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/v3-menu-plan.txt')]);
  assert.strictEqual(result.status, 0, output(result));
  assert.match(result.stdout, /\[1\] Review plan/);
  assert.match(result.stdout, /MAIN Candidates/);
});

test('TUI brand logo encodes counsel funnel and tagline', () => {
  const { renderLogo, BRAND_TAGLINE } = require('../lib/tui/logo');
  const frame = renderLogo(60, false).join('\n');
  assert.match(frame, /METIS/);
  assert.match(frame, /\\   \|   \//);
  assert.match(frame, /· · · · ·/);
  assert.ok(frame.includes(BRAND_TAGLINE));
  assert.doesNotMatch(frame, /placeholder/i);
});

test('TUI welcome menu renders audit-failure options', () => {
  const pipeline = scanWorkflow(fixturePath('sensitive-metadata-project'));
  const generated = initDryRunWorkflow(pipeline);
  const model = buildTuiViewModel(pipeline, generated);
  model.welcome = require('../lib/ui/view-model').buildWelcomeHints(model.summary);
  const frame = renderFrame(model, 'scan-results', { pipeline, generated }, 100, {
    menuFocusIndex: 0,
    menuActive: true,
  });
  assert.match(frame, /\[1\] View safety audit/);
  assert.match(frame, /audit failed/);
});

test('TUI v3 scripted tab-complete and invalid command recovery', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const tabResult = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/v3-history-tab.txt')]);
  assert.strictEqual(tabResult.status, 0, output(tabResult));
  assert.match(tabResult.stdout, /completed: preview-diff|MAIN Diff Preview/);
  assert.match(tabResult.stdout, /MAIN Candidates/);

  const invalidResult = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/v3-invalid.txt')]);
  assert.strictEqual(invalidResult.status, 0, output(invalidResult));
  assert.match(invalidResult.stdout, /Invalid transition|invalid command/);
  assert.match(invalidResult.stdout, /MAIN Candidates/);
});

test('TUI v3 renderer adapts to 80, 100, and 140 column widths', () => {
  const pipeline = scanWorkflow(fixturePath('mixed-agent-project'));
  const generated = initDryRunWorkflow(pipeline);
  const model = buildTuiViewModel(pipeline, generated);
  const context = { pipeline, generated };

  const narrow = renderFrame(model, 'scan-results', context, 80);
  assert.match(narrow, /METIS WORKBENCH/);
  assert.doesNotMatch(narrow, /DETAIL \/ AUDIT/);

  const medium = renderFrame(model, 'scan-results', context, 100);
  assert.doesNotMatch(medium, /DETAIL \/ AUDIT/);

  const wide = renderFrame(model, 'scan-results', context, 140);
  assert.match(wide, /DETAIL \/ AUDIT/);
});

test('TUI proposal review scripted workflow saves and inspects proposals', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const result = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/proposal-happy.txt')]);
  assert.strictEqual(result.status, 0, output(result));
  assert.match(result.stdout, /Proposal Review|proposal saved|Proposal saved/i);
  assert.ok(fs.existsSync(path.join(root, '.metis', 'proposals')));
});

test('TUI proposal accept apply marks proposal applied', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const script = path.join(root, 'proposal-apply.txt');
  fs.writeFileSync(script, [
    'plan',
    'save-proposal --yes',
    'proposal-accept-apply latest',
    'confirm-apply APPLY METIS',
  ].join('\n'));

  const result = runMetis(['tui', '--fixture', root, '--script', script]);
  assert.strictEqual(result.status, 0, output(result));
  const { proposals } = require('../lib/core/proposals').listProposals(root);
  assert.strictEqual(proposals.length, 1);
  assert.strictEqual(proposals[0].status, 'applied');
});

test('scripted TUI exits nonzero on workflow failure', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const script = path.join(root, 'bad-proposal.txt');
  fs.writeFileSync(script, 'proposal-inspect latest\n');

  const result = runMetis(['tui', '--fixture', root, '--script', script]);
  assert.strictEqual(result.status, 1, output(result));
  assert.match(result.stdout, /No saved proposals/);
});

test('TUI save-proposal requires explicit confirmation', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const result = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/proposal-error.txt')]);
  assert.strictEqual(result.status, 0, output(result));
  assert.match(result.stdout, /save-proposal --yes/);
  assert.strictEqual(fs.existsSync(path.join(root, '.metis', 'proposals')), false);
});

test('TUI proposal dismiss requires explicit confirmation', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const result = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/proposal-dismiss.txt')]);
  assert.strictEqual(result.status, 0, output(result));
  assert.match(result.stdout, /proposal-dismiss .* --yes/);
  const { proposals } = require('../lib/core/proposals').listProposals(root);
  assert.strictEqual(proposals.length, 1);
  assert.strictEqual(proposals[0].status, 'pending');
});

test('Raw key parser handles multi-key chunks for guided shell input', () => {
  const keys = parseKeyChunk('plan\rpre\t\r\x1b[A\x1b[B\x7f');
  assert.deepStrictEqual(keys.map((key) => key.type), [
    'text',
    'text',
    'text',
    'text',
    'enter',
    'text',
    'text',
    'text',
    'tab',
    'enter',
    'up',
    'down',
    'backspace',
  ]);
  assert.strictEqual(keys.filter((key) => key.type === 'text').map((key) => key.value).join(''), 'planpre');
});
