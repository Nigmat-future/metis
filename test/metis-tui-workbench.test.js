const { test } = require('node:test');
const assert = require('node:assert');
const {
  RAIL_STEPS,
  activeRailIndex,
  getListRows,
  railStepCommand,
  listSelectCommand,
} = require('../lib/tui/workbench');
const { scanWorkflow, initDryRunWorkflow } = require('../lib/workflows');
const { buildTuiViewModel } = require('../lib/ui/view-model');
const { renderFrame } = require('../lib/tui/renderer');
const { fixturePath, copyFixtureToTemp, snapshotFiles } = require('./helpers/fixtures');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const metisCli = path.join(__dirname, '..', 'bin', 'metis.js');
const repoRoot = path.join(__dirname, '..');

function runMetis(args, options = {}) {
  return spawnSync(process.execPath, [metisCli, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
  });
}

test('workbench rail commands map to valid CLI events', () => {
  assert.strictEqual(railStepCommand('plan'), 'plan');
  assert.strictEqual(railStepCommand('diff'), 'preview-diff');
  assert.strictEqual(railStepCommand('rollback'), null);
  assert.strictEqual(activeRailIndex('candidate-plan'), RAIL_STEPS.indexOf('plan'));
});

test('workbench list rows expose evidence and candidate ids', () => {
  const pipeline = scanWorkflow(fixturePath('mixed-agent-project'));
  const generated = initDryRunWorkflow(pipeline);
  const model = buildTuiViewModel(pipeline, generated);
  const shell = { showWelcome: false };
  const evidenceRows = getListRows('scan-results', model, shell);
  assert.ok(evidenceRows.length > 0);
  assert.strictEqual(evidenceRows[0].kind, 'evidence');
  const candidateRows = getListRows('candidate-plan', model, shell);
  assert.ok(candidateRows.length > 0);
  assert.strictEqual(listSelectCommand(candidateRows[0]).event, 'select-candidate');
});

test('renderer highlights rail and list focus zones', () => {
  const pipeline = scanWorkflow(fixturePath('mixed-agent-project'));
  const generated = initDryRunWorkflow(pipeline);
  const model = buildTuiViewModel(pipeline, generated);
  const context = { pipeline, generated };
  const railFrame = renderFrame(model, 'candidate-plan', context, 140, {
    focusZone: 'rail',
    railFocusIndex: RAIL_STEPS.indexOf('diff'),
    listFocusIndex: 0,
    workbenchNavActive: true,
  });
  assert.match(railFrame, /▶\[ \] diff/);
  const listFrame = renderFrame(model, 'candidate-plan', context, 140, {
    focusZone: 'list',
    railFocusIndex: RAIL_STEPS.indexOf('plan'),
    listFocusIndex: 0,
    workbenchNavActive: true,
  });
  assert.match(listFrame, /▶generate/);
});

test('scripted workbench rail and list navigation reaches diff preview', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const result = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/v3-workbench-nav.txt')]);
  assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /MAIN Diff Preview/);
  assert.match(result.stdout, /Tab: list · ↑↓ rail/);
});

test('scripted apply flow shows confirmation guide and supports cancel', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const before = snapshotFiles(root);
  const result = runMetis(['tui', '--fixture', root, '--script', fixturePath('tui/v3-apply-guide.txt')]);
  assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Apply confirmation required/);
  assert.match(result.stdout, /APPLY METIS/);
  assert.match(result.stdout, /\[1\] Cancel apply/);
  assert.match(result.stdout, /Cancelled/);
  assert.deepStrictEqual(snapshotFiles(root), before);
});
