const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { copyFixtureToTemp, fixturePath } = require('./helpers/fixtures');

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

function saveProposalId(root) {
  const save = runMetis(['evolve', '--save-proposal', '--yes', '--fixture', root]);
  assert.strictEqual(save.status, 0, output(save));
  const match = save.stdout.match(/Proposal saved: (metis-proposal-[a-z0-9]+)/);
  assert.ok(match, output(save));
  return match[1];
}

test('evolve --dry-run does not write proposals', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const result = runMetis(['evolve', '--dry-run', '--fixture', root]);
  assert.strictEqual(result.status, 0, output(result));
  assert.strictEqual(fs.existsSync(path.join(root, '.metis', 'proposals')), false);
});

test('CLI proposal lifecycle on mixed fixture', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const id = saveProposalId(root);

  const list = runMetis(['proposal', 'list', '--fixture', root]);
  assert.strictEqual(list.status, 0, output(list));
  assert.match(list.stdout, new RegExp(id));

  const inspect = runMetis(['proposal', 'inspect', id, '--fixture', root]);
  assert.strictEqual(inspect.status, 0, output(inspect));
  assert.match(inspect.stdout, /Baseline hash:/);

  const dryRun = runMetis(['proposal', 'accept', id, '--dry-run', '--fixture', root]);
  assert.strictEqual(dryRun.status, 0, output(dryRun));
  assert.match(dryRun.stdout, /diff|CLAUDE|AGENTS|\.metis/i);

  const apply = runMetis(['proposal', 'accept', id, '--apply', '--yes', '--fixture', root]);
  assert.strictEqual(apply.status, 0, output(apply));
  assert.ok(fs.existsSync(path.join(root, '.metis', 'evidence', 'index.json')));
});

test('CLI proposal blocks missing id and sensitive save', () => {
  const missing = runMetis(['proposal', 'inspect', 'metis-proposal-missing', '--fixture', fixturePath('mixed-agent-project')]);
  assert.strictEqual(missing.status, 1);

  const root = copyFixtureToTemp('sensitive-metadata-project');
  const save = runMetis(['evolve', '--save-proposal', '--yes', '--fixture', root]);
  assert.strictEqual(save.status, 1, output(save));
  assert.strictEqual(fs.existsSync(path.join(root, '.metis', 'proposals')), false);
});

test('CLI proposal dismiss requires --yes', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const id = saveProposalId(root);
  const missingYes = runMetis(['proposal', 'dismiss', id, '--fixture', root]);
  assert.strictEqual(missingYes.status, 2, output(missingYes));
  const dismissed = runMetis(['proposal', 'dismiss', id, '--yes', '--fixture', root]);
  assert.strictEqual(dismissed.status, 0, output(dismissed));
  const accept = runMetis(['proposal', 'accept', id, '--dry-run', '--fixture', root]);
  assert.strictEqual(accept.status, 1, output(accept));
  assert.match(accept.stderr, /dismissed/i);
});

test('CLI proposal accept blocks baseline drift and re-apply', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const id = saveProposalId(root);
  fs.writeFileSync(path.join(root, 'docs', 'extra.md'), '# extra doc after save\n', 'utf8');

  const drift = runMetis(['proposal', 'accept', id, '--dry-run', '--fixture', root]);
  assert.strictEqual(drift.status, 1, output(drift));
  assert.match(drift.stderr, /baseline changed/i);

  fs.unlinkSync(path.join(root, 'docs', 'extra.md'));
  assert.strictEqual(runMetis(['proposal', 'accept', id, '--dry-run', '--fixture', root]).status, 0);
  assert.strictEqual(runMetis(['proposal', 'accept', id, '--apply', '--yes', '--fixture', root]).status, 0);

  const reapply = runMetis(['proposal', 'accept', id, '--dry-run', '--fixture', root]);
  assert.strictEqual(reapply.status, 1, output(reapply));
  assert.match(reapply.stderr, /already applied/i);
});

test('CLI proposal accept apply requires prior dry-run', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const id = saveProposalId(root);
  const apply = runMetis(['proposal', 'accept', id, '--apply', '--yes', '--fixture', root]);
  assert.strictEqual(apply.status, 1, output(apply));
  assert.match(apply.stderr, /accepted with --dry-run/i);
});
