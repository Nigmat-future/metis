const assert = require('node:assert');
const { test } = require('node:test');
const { classifyCorrection, fingerprint } = require('../lib/core/correction-signals');

test('detects English negative imperative as a correction', () => {
  const result = classifyCorrection("Don't edit generated files directly");
  assert.strictEqual(result.isCorrection, true);
  assert.strictEqual(result.type, 'negation');
  assert.ok(result.signals.includes('negation'));
});

test('detects Chinese negation as a correction', () => {
  const result = classifyCorrection('不要直接改生成的文件');
  assert.strictEqual(result.isCorrection, true);
  assert.strictEqual(result.type, 'negation');
});

test('detects re-instruction ("actually / I said") as a correction', () => {
  const result = classifyCorrection('Actually, I said run the real test command first');
  assert.strictEqual(result.isCorrection, true);
  assert.strictEqual(result.type, 'reinstruction');
});

test('detects Chinese re-instruction as a correction', () => {
  const result = classifyCorrection('我说过先跑真实测试，再来一次');
  assert.strictEqual(result.isCorrection, true);
  assert.strictEqual(result.type, 'reinstruction');
});

test('detects undo/revert language as a correction', () => {
  const result = classifyCorrection('revert that change, it broke the build');
  assert.strictEqual(result.isCorrection, true);
  assert.strictEqual(result.type, 'undo');
});

test('plain neutral request is not a correction', () => {
  const result = classifyCorrection('Please add a new endpoint for users');
  assert.strictEqual(result.isCorrection, false);
  assert.strictEqual(result.type, null);
  assert.deepStrictEqual(result.signals, []);
});

test('empty or non-string input is safely not a correction', () => {
  assert.strictEqual(classifyCorrection('').isCorrection, false);
  assert.strictEqual(classifyCorrection(null).isCorrection, false);
  assert.strictEqual(classifyCorrection(undefined).isCorrection, false);
  assert.strictEqual(classifyCorrection(42).isCorrection, false);
});

test('negation takes precedence when multiple signals appear', () => {
  const result = classifyCorrection("No, don't do that. Actually use the lint script.");
  assert.strictEqual(result.isCorrection, true);
  assert.strictEqual(result.type, 'negation');
  assert.ok(result.signals.length >= 2);
});

test('fingerprint normalizes casing, punctuation, and whitespace', () => {
  const a = fingerprint("Don't  edit GENERATED files!!!");
  const b = fingerprint('dont edit generated files');
  assert.strictEqual(a, b);
});

test('fingerprint strips leading correction markers so intent clusters', () => {
  const a = fingerprint("Don't run the build before tests");
  const b = fingerprint('Actually, run the build before tests');
  assert.strictEqual(a, b);
});

test('fingerprint is stable and order-preserving for distinct intents', () => {
  const a = fingerprint('run the real test command');
  const b = fingerprint('respond in simplified chinese');
  assert.notStrictEqual(a, b);
});

test('fingerprint returns empty string for empty input', () => {
  assert.strictEqual(fingerprint(''), '');
  assert.strictEqual(fingerprint(null), '');
});
