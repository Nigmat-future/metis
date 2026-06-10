const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { copyFixtureToTemp, fixturePath, snapshotFiles } = require('./helpers/fixtures');

const metisCli = path.join(__dirname, '..', 'bin', 'metis.js');
const repoRoot = path.join(__dirname, '..');

function run(args, options = {}) {
  return spawnSync(process.execPath, [metisCli, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
  });
}

test('doctor reports diagnostics without writes', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const before = snapshotFiles(root);
  const result = run(['doctor', '--fixture', root]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Metis doctor/);
  assert.match(result.stdout, /remote calls\s+disabled/);
  assert.match(result.stdout, /telemetry\s+disabled/);
  assert.match(result.stdout, /metis scan/);
  assert.match(result.stdout, /Writes: none/);
  assert.deepStrictEqual(snapshotFiles(root), before);
});

test('doctor json mode is stable', () => {
  const result = run(['doctor', '--fixture', fixturePath('mixed-agent-project'), '--json']);
  assert.strictEqual(result.status, 0);
  const parsed = JSON.parse(result.stdout);
  assert.strictEqual(parsed.brand, 'Metis');
  assert.ok(parsed.evidenceCount > 0);
  assert.strictEqual(parsed.safety.telemetry, 'disabled');
});

test('doctor on empty root recommends scan', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-empty-'));
  const result = run(['doctor', '--fixture', root]);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /items found\s+0/);
  assert.match(result.stdout, /metis scan/);
});

test('help lists doctor command', () => {
  const result = run(['--help']);
  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /doctor/);
});
