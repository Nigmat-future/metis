const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { copyFixtureToTemp, fixturePath } = require('./helpers/fixtures');
const { rollbackScaffold } = require('../lib/applier/rollback');
const { METIS_MARKER_BEGIN, LEGACY_PCA_MARKER_BEGIN } = require('../lib/core/artifacts');

const metisCli = path.join(__dirname, '..', 'bin', 'metis.js');
const pcaCli = path.join(__dirname, '..', 'bin', 'pca.js');
const repoRoot = path.join(__dirname, '..');

function runMetis(args, options = {}) {
  return spawnSync(process.execPath, [metisCli, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
  });
}

function runPca(args) {
  return spawnSync(process.execPath, [pcaCli, ...args], { cwd: repoRoot, encoding: 'utf8' });
}

test('pca alias init apply still works during transition', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const result = runPca(['init', '--apply', '--yes', '--fixture', root]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Applied Metis scaffold/);
});

test('evolve reads legacy .pca evidence index when .metis is absent', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const evidenceDir = path.join(root, '.pca', 'evidence');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'index.json'), JSON.stringify({
    schemaVersion: 1,
    candidates: [{ title: 'Legacy rule', body: 'legacy', decision: 'generate', evidenceIds: ['ev_000001'], risk: 'low', targets: ['AGENTS.md'], tokenCostEstimate: 10 }],
  }, null, 2));

  const result = runMetis(['evolve', '--dry-run', '--fixture', root]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Evolution proposal/);
});

test('legacy pca rollback record restores files', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const rollbackId = 'pca-legacy01';
  const rollbackDir = path.join(root, '.pca', 'rollback');
  fs.mkdirSync(rollbackDir, { recursive: true });
  const record = {
    schemaVersion: 1,
    id: rollbackId,
    paths: [
      { path: 'AGENTS.md', existed: true, content: fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8') },
      { path: '.pca/evidence/index.json', existed: false, content: '' },
    ],
    backup: {
      paths: [
        { path: 'AGENTS.md', existed: true, content: fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8') },
        { path: '.pca/evidence/index.json', existed: false, content: '' },
      ],
    },
    cleanup: { rollbackPath: `.pca/rollback/${rollbackId}.json` },
  };
  fs.writeFileSync(path.join(rollbackDir, `${rollbackId}.json`), `${JSON.stringify(record, null, 2)}\n`);
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'CHANGED BY TEST\n');

  const result = rollbackScaffold(root, rollbackId);
  assert.strictEqual(result.exitCode, 0);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /CHANGED BY TEST/);
});

test('PCA markers migrate to single METIS section on dry-run', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const agentsPath = path.join(root, 'AGENTS.md');
  const original = fs.readFileSync(agentsPath, 'utf8');
  fs.writeFileSync(agentsPath, `${original}\n<!-- PCA:BEGIN -->\nold\n<!-- PCA:END -->\n`);

  const result = runMetis(['init', '--dry-run', '--fixture', root]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /METIS:BEGIN/);
  const pcaSections = (result.stdout.match(/PCA:BEGIN/g) || []).length;
  const metisSections = (result.stdout.match(/METIS:BEGIN/g) || []).length;
  assert.ok(metisSections >= 1);
  assert.ok(pcaSections <= metisSections);
});

test('marker constants are distinct', () => {
  assert.notStrictEqual(METIS_MARKER_BEGIN, LEGACY_PCA_MARKER_BEGIN);
});
