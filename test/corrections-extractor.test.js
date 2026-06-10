const assert = require('node:assert');
const { test } = require('node:test');
const { clusterCorrections } = require('../lib/extractor/corrections');

function rec(id, fingerprint, type = 'negation', extra = {}) {
  return { id, fingerprint, type, signals: [type], text: fingerprint, source: 'manual', ...extra };
}

test('groups identical fingerprints into one cluster with frequency count', () => {
  const clusters = clusterCorrections([
    rec('c1', 'run the real test command'),
    rec('c2', 'run the real test command'),
    rec('c3', 'run the real test command'),
  ]);
  assert.strictEqual(clusters.length, 1);
  assert.strictEqual(clusters[0].frequency, 3);
  assert.deepStrictEqual(clusters[0].correctionIds.sort(), ['c1', 'c2', 'c3']);
});

test('near-identical fingerprints cluster together', () => {
  const clusters = clusterCorrections([
    rec('c1', 'run the real test command before answering'),
    rec('c2', 'run the real test command before answer'),
  ]);
  assert.strictEqual(clusters.length, 1, 'one-word edit should still cluster');
  assert.strictEqual(clusters[0].frequency, 2);
});

test('distinct intents stay in separate clusters', () => {
  const clusters = clusterCorrections([
    rec('c1', 'run the real test command'),
    rec('c2', 'respond in simplified chinese'),
  ]);
  assert.strictEqual(clusters.length, 2);
});

test('clusters are sorted by frequency descending, then id', () => {
  const clusters = clusterCorrections([
    rec('c1', 'respond in simplified chinese'),
    rec('c2', 'run the real test command'),
    rec('c3', 'run the real test command'),
  ]);
  assert.strictEqual(clusters[0].frequency, 2);
  assert.match(clusters[0].representative, /test command/);
});

test('empty input yields no clusters', () => {
  assert.deepStrictEqual(clusterCorrections([]), []);
  assert.deepStrictEqual(clusterCorrections(null), []);
});

test('cluster preserves dominant type and example text', () => {
  const clusters = clusterCorrections([
    rec('c1', 'dont edit generated files', 'negation'),
    rec('c2', 'dont edit generated files', 'negation'),
  ]);
  assert.strictEqual(clusters[0].type, 'negation');
  assert.ok(typeof clusters[0].representative === 'string');
});
