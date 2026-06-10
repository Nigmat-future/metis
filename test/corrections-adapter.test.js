const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const corrections = require('../lib/adapters/corrections');
const { appendCorrection } = require('../lib/core/corrections-store');
const { createEvidenceBuilder } = require('../lib/core/evidence');
const { createRedactor } = require('../lib/core/redactor');

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'metis-corr-adapter-'));
}

function scan(root) {
  const builder = createEvidenceBuilder({ redactor: createRedactor(), root });
  corrections.scan({ root, options: {}, redactor: createRedactor(), builder });
  return builder.finalize();
}

test('adapter emits one evidence record per cluster with frequency', () => {
  const root = tempRoot();
  appendCorrection(root, { text: "Don't edit generated files" });
  appendCorrection(root, { text: "don't edit generated files" });
  appendCorrection(root, { text: 'stop replying in english, respond in simplified chinese' });

  const evidence = scan(root);
  const correctionEvidence = evidence.filter((e) => e.kind === 'correction');
  assert.strictEqual(correctionEvidence.length, 2);
  const top = correctionEvidence.find((e) => e.details.frequency === '2');
  assert.ok(top, 'a cluster of two should report frequency 2');
  assert.strictEqual(top.source, 'corrections');
});

test('adapter writes no evidence when the log is absent', () => {
  const root = tempRoot();
  const evidence = scan(root);
  assert.strictEqual(evidence.filter((e) => e.kind === 'correction').length, 0);
});

test('correction evidence targets agent scaffolds', () => {
  const root = tempRoot();
  appendCorrection(root, { text: 'stop editing the lockfile' });
  const evidence = scan(root).filter((e) => e.kind === 'correction');
  assert.ok(evidence[0].targets.includes('CLAUDE.md'));
});
