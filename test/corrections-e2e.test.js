const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const cli = path.join(__dirname, '..', 'bin', 'metis.js');

function tempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-note-e2e-'));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'node --test' } }));
  return root;
}

function run(args, root) {
  return spawnSync(process.execPath, [cli, ...args, '--fixture', root], { encoding: 'utf8' });
}

test('note captures a correction and reports its type', () => {
  const root = tempProject();
  const result = run(['note', "Don't edit generated files directly"], root);
  assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Captured negation correction corr_/);
  assert.ok(fs.existsSync(path.join(root, '.metis', 'corrections', 'log.jsonl')));
});

test('note refuses text that is not a correction', () => {
  const root = tempProject();
  const result = run(['note', 'please add a users endpoint'], root);
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /not a correction/i);
});

test('note redacts secrets before they reach the log', () => {
  const root = tempProject();
  run(['note', "don't commit the token sk-ant-abcd1234efgh5678"], root);
  const log = fs.readFileSync(path.join(root, '.metis', 'corrections', 'log.jsonl'), 'utf8');
  assert.doesNotMatch(log, /sk-ant-abcd1234efgh5678/);
  assert.match(log, /redacted:api-key/);
});

test('a correction repeated across notes climbs to a generate decision in plan', () => {
  const root = tempProject();
  run(['note', 'actually, run the real test command before answering'], root);
  run(['note', 'i said run the real test command before answering'], root);
  run(['note', 'again: run the real test command before answering'], root);
  run(['note', 'i told you, run the real test command before answering'], root);

  const plan = run(['plan', '--json'], root);
  assert.strictEqual(plan.status, 0, `${plan.stdout}\n${plan.stderr}`);
  const parsed = JSON.parse(plan.stdout);
  const correction = parsed.candidates.find((c) => /Repeated correction/.test(c.title));
  assert.ok(correction, 'a repeated-correction candidate should appear');
  assert.ok(correction.frequency >= 4, `expected frequency >= 4, got ${correction.frequency}`);
  assert.strictEqual(correction.decision, 'generate');
});

test('plan stays clean when no corrections are logged', () => {
  const root = tempProject();
  const plan = run(['plan', '--json'], root);
  assert.strictEqual(plan.status, 0);
  const parsed = JSON.parse(plan.stdout);
  assert.strictEqual(parsed.candidates.some((c) => /Repeated correction/.test(c.title)), false);
});
