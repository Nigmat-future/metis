const assert = require('node:assert');
const { test } = require('node:test');
const { extractRevertCorrections } = require('../lib/adapters/git-history');

function fakeGit(logOutput) {
  return (args) => {
    if (args[0] === 'rev-parse') return { status: 0, stdout: '.git\n' };
    if (args[0] === 'log') return { status: 0, stdout: logOutput };
    return { status: 1, stdout: '' };
  };
}

const SUBJECTS = [
  'Revert "add caching layer"',
  'fix: undo the broken migration',
  'revert: drop the experimental flag',
  'feat: add users endpoint',
  'docs: tidy readme',
].join('\n');

test('finds revert and undo commits as corrections', () => {
  const found = extractRevertCorrections('/repo', { git: fakeGit(SUBJECTS) });
  assert.strictEqual(found.length, 3);
  assert.ok(found.every((f) => f.source === 'git:revert'));
  assert.ok(found.every((f) => f.type === 'undo'));
});

test('plain feature and docs commits are ignored', () => {
  const found = extractRevertCorrections('/repo', { git: fakeGit(SUBJECTS) });
  assert.strictEqual(found.some((f) => /users endpoint/.test(f.text)), false);
  assert.strictEqual(found.some((f) => /tidy readme/.test(f.text)), false);
});

test('returns empty when not a git repository', () => {
  const git = () => ({ status: 128, stdout: '' });
  assert.deepStrictEqual(extractRevertCorrections('/repo', { git }), []);
});

test('each correction carries a fingerprint for clustering', () => {
  const found = extractRevertCorrections('/repo', { git: fakeGit('Revert "add caching layer"') });
  assert.strictEqual(found.length, 1);
  assert.ok(found[0].fingerprint.length > 0);
});
