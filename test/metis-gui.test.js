const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { fixturePath } = require('./helpers/fixtures');

const metisCli = path.join(__dirname, '..', 'bin', 'metis.js');
const repoRoot = path.join(__dirname, '..');

const CANARIES = [
  'sk-pca-fake-secret',
  'ghp_abcdefghijklmnopqrstuvwxyz123456',
  'internal.customer.example',
  'VeryPrivateName',
  'very-private-name',
  'ignore previous instructions',
];

function runMetis(args) {
  return spawnSync(process.execPath, [metisCli, ...args], { cwd: repoRoot, encoding: 'utf8' });
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test('gui without --preview exits 2', () => {
  const result = runMetis(['gui', '--fixture', fixturePath('mixed-agent-project')]);
  assert.strictEqual(result.status, 2);
});

test('gui preview generates read-only HTML sections', () => {
  const out = path.join(os.tmpdir(), `metis-preview-${Date.now()}.html`);
  const result = runMetis(['gui', '--preview', '--fixture', fixturePath('mixed-agent-project'), '--out', out]);
  assert.strictEqual(result.status, 0, output(result));
  assert.ok(fs.existsSync(out));
  const html = fs.readFileSync(out, 'utf8');
  assert.match(html, /Metis Review Dashboard/);
  assert.match(html, /id="overview"/);
  assert.match(html, /id="evidence"/);
  assert.match(html, /id="candidates"/);
  assert.match(html, /id="audit"/);
  assert.match(html, /id="diff"/);
  assert.match(html, /id="rollback"/);
  assert.match(html, /id="evolve"/);
  assert.match(html, /Evidence/);
  assert.match(html, /Candidates/);
  assert.match(html, /Safety Audit/);
  assert.match(html, /Diff Preview/);
  assert.match(html, /Rollback Ledger/);
  assert.match(html, /Evolve Proposal Summary/);
  assert.match(html, /id="metis-search"/);
  assert.match(html, /id="metis-export"/);
  assert.match(html, /"schemaVersion":1/);
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:/i);
  assert.doesNotMatch(html, /data-action=["']apply/i);
  assert.doesNotMatch(html, /<button[^>]*apply/i);
  for (const canary of CANARIES) assert.doesNotMatch(html, new RegExp(canary, 'i'));
  fs.rmSync(out, { force: true });
});

test('gui implementation has no network imports', () => {
  const files = [path.join(repoRoot, 'lib', 'gui', 'index.js'), path.join(repoRoot, 'lib', 'gui', 'preview.js')];
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /node:(?:http|https|net|tls)\b/);
    assert.doesNotMatch(source, /require\(['"](?:http|https|net|tls)['"]\)/);
    assert.doesNotMatch(source, /\bfetch\s*\(/);
  }
});

test('gui preview html has responsive layout and no mutation forms', () => {
  const out = path.join(os.tmpdir(), `metis-layout-${Date.now()}.html`);
  runMetis(['gui', '--preview', '--fixture', fixturePath('mixed-agent-project'), '--out', out]);
  const html = fs.readFileSync(out, 'utf8');
  assert.match(html, /@media \(min-width: 900px\)/);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /data-action=["'](?:apply|rollback|write|mutate)/i);
  fs.rmSync(out, { force: true });
});

test('sensitive gui preview redacts canaries and shows audit issues', () => {
  const out = path.join(os.tmpdir(), `metis-sensitive-${Date.now()}.html`);
  const result = runMetis(['gui', '--preview', '--fixture', fixturePath('sensitive-metadata-project'), '--out', out]);
  assert.strictEqual(result.status, 0, output(result));
  const html = fs.readFileSync(out, 'utf8');
  assert.match(html, /failed|Safety Audit/i);
  for (const canary of CANARIES) assert.doesNotMatch(html, new RegExp(canary, 'i'));
  fs.rmSync(out, { force: true });
});
