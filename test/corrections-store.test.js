const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { appendCorrection, readCorrections } = require('../lib/core/corrections-store');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'metis-corr-'));
}

test('appendCorrection writes a redacted record and readCorrections reads it back', () => {
  const root = tempRoot();
  const record = appendCorrection(root, { text: "Don't run npm test with the token sk-ant-abcd1234efgh5678" });

  assert.strictEqual(record.type, 'negation');
  assert.ok(record.id.startsWith('corr_'));
  assert.ok(record.fingerprint.length > 0);
  assert.doesNotMatch(record.text, /sk-ant-abcd1234efgh5678/, 'secret must be redacted at write time');
  assert.match(record.text, /\[redacted:api-key\]/);

  const all = readCorrections(root);
  assert.strictEqual(all.length, 1);
  assert.strictEqual(all[0].id, record.id);
  assert.strictEqual(all[0].source, 'manual');
});

test('appendCorrection rejects text that is not a correction', () => {
  const root = tempRoot();
  assert.throws(() => appendCorrection(root, { text: 'Please add a users endpoint' }), /not a correction/i);
});

test('readCorrections returns empty array when no log exists', () => {
  const root = tempRoot();
  assert.deepStrictEqual(readCorrections(root), []);
});

test('readCorrections tolerates a corrupt line without throwing', () => {
  const root = tempRoot();
  appendCorrection(root, { text: "don't edit generated files" });
  const logPath = path.join(root, '.metis', 'corrections', 'log.jsonl');
  fs.appendFileSync(logPath, 'not-json-garbage\n');
  appendCorrection(root, { text: 'revert that commit' });

  const all = readCorrections(root);
  assert.strictEqual(all.length, 2, 'valid records survive a corrupt line');
});

test('appendCorrection carries an explicit source label through', () => {
  const root = tempRoot();
  const record = appendCorrection(root, { text: 'stop touching the lockfile', source: 'transcript:claude' });
  assert.strictEqual(record.source, 'transcript:claude');
});
