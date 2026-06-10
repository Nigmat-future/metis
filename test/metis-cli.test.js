const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { copyFixtureToTemp, fixturePath, snapshotFiles } = require('./helpers/fixtures');

const metisCli = path.join(__dirname, '..', 'bin', 'metis.js');
const pcaCli = path.join(__dirname, '..', 'bin', 'pca.js');
const repoRoot = path.join(__dirname, '..');

function runMetis(args, options = {}) {
  return spawnSync(process.execPath, [metisCli, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
  });
}

function runPca(args, options = {}) {
  return spawnSync(process.execPath, [pcaCli, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
  });
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test('metis help shows Metis branding and tui command', () => {
  const result = runMetis(['--help']);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Usage: metis/);
  assert.match(result.stdout, /tui/);
  assert.match(result.stdout, /gui --preview/);
});

test('pca help shows deprecation note', () => {
  const result = runPca(['--help']);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /deprecated alias for metis/);
});

test('metis scan works on mixed fixture', () => {
  const result = runMetis(['scan', '--fixture', fixturePath('mixed-agent-project')]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Metis: scanning local agent evidence/);
  assert.match(result.stdout, /Writes: none/);
});

test('pca alias scan still works', () => {
  const result = runPca(['scan', '--fixture', fixturePath('mixed-agent-project')]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Metis: scanning local agent evidence/);
});

test('apply writes metis artifacts and rollback restores prior state', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const before = snapshotFiles(root);

  const apply = runMetis(['init', '--apply', '--yes', '--fixture', root]);
  assert.strictEqual(apply.status, 0, output(apply));
  const rollbackId = /Rollback ID: (\S+)/.exec(apply.stdout)[1];
  assert.match(rollbackId, /^metis-/);

  assert.ok(fs.existsSync(path.join(root, '.metis', 'evidence', 'index.json')));
  assert.ok(fs.existsSync(path.join(root, '.metis', 'rollback', `${rollbackId}.json`)));
  assert.strictEqual(fs.existsSync(path.join(root, '.pca')), false);

  const rollback = runMetis(['rollback', rollbackId, '--fixture', root]);
  assert.strictEqual(rollback.status, 0, output(rollback));
  assert.deepStrictEqual(snapshotFiles(root), before);
});

test('init dry-run shows metis evidence path', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const result = runMetis(['init', '--dry-run', '--fixture', root]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /\.metis\/evidence\/index\.json/);
  assert.match(result.stdout, /METIS:BEGIN/);
});
