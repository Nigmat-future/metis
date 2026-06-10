const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { readTranscriptCorrections, encodeProjectDir } = require('../lib/adapters/transcript');

function fakeClaudeHome(root, lines) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-home-'));
  const dir = path.join(home, '.claude', 'projects', encodeProjectDir(root));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'session-1.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n'));
  return home;
}

test('extracts user-turn corrections from a Claude transcript', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-proj-'));
  const home = fakeClaudeHome(root, [
    { type: 'user', message: { role: 'user', content: 'add a users endpoint' } },
    { type: 'assistant', message: { role: 'assistant', content: 'done' } },
    { type: 'user', message: { role: 'user', content: "don't edit the generated files" } },
    { type: 'user', message: { role: 'user', content: 'actually, run the real test command first' } },
  ]);

  const found = readTranscriptCorrections(root, { home });
  assert.strictEqual(found.length, 2, 'two of three user turns are corrections');
  assert.ok(found.every((f) => f.source === 'transcript:claude'));
  assert.ok(found.some((f) => f.type === 'negation'));
  assert.ok(found.some((f) => f.type === 'reinstruction'));
});

test('redacts secrets found inside transcript corrections', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-proj-'));
  const home = fakeClaudeHome(root, [
    { type: 'user', message: { role: 'user', content: "don't hardcode the key sk-ant-secret12345678" } },
  ]);
  const found = readTranscriptCorrections(root, { home });
  assert.strictEqual(found.length, 1);
  assert.doesNotMatch(found[0].text, /sk-ant-secret12345678/);
});

test('returns empty when no transcript directory exists', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-proj-'));
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-empty-home-'));
  assert.deepStrictEqual(readTranscriptCorrections(root, { home }), []);
});

test('tolerates content arrays and corrupt lines', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-proj-'));
  const home = fakeClaudeHome(root, [
    { type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'stop touching the lockfile' }] } },
  ]);
  fs.appendFileSync(
    path.join(home, '.claude', 'projects', encodeProjectDir(root), 'session-1.jsonl'),
    '\nGARBAGE NOT JSON\n',
  );
  const found = readTranscriptCorrections(root, { home });
  assert.strictEqual(found.length, 1);
  assert.strictEqual(found[0].type, 'negation');
});
