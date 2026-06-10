const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { learnWorkflow, noteWorkflow } = require('../lib/workflows/corrections');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'metis-learn-'));
}

test('learn rejects unsupported sources', () => {
  const result = learnWorkflow(tempRoot(), { source: 'codex', dryRun: true });
  assert.strictEqual(result.exitCode, 2);
  assert.match(result.stderr, /supports --source claude, git, or all/);
});

test('learn dry-run reports no corrections cleanly when none exist', () => {
  const result = learnWorkflow(tempRoot(), { source: 'claude', dryRun: true });
  assert.strictEqual(result.exitCode, 0);
  assert.match(result.stdout, /No corrections found/);
});

test('noteWorkflow rejects empty text', () => {
  const result = noteWorkflow(tempRoot(), '   ');
  assert.strictEqual(result.exitCode, 2);
  assert.match(result.stderr, /non-empty/);
});

test('noteWorkflow captures and points at plan', () => {
  const result = noteWorkflow(tempRoot(), 'stop editing the lockfile');
  assert.strictEqual(result.exitCode, 0);
  assert.match(result.stdout, /Captured negation correction/);
  assert.match(result.stdout, /metis plan/);
});
