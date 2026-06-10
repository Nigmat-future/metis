const assert = require('node:assert');
const fs = require('node:fs');
const { test } = require('node:test');
const { fixturePath } = require('./helpers/fixtures');
const { scanWorkflow } = require('../lib/workflows');

test('scanWorkflow returns evidence without writes', () => {
  const root = fixturePath('mixed-agent-project');
  const before = fs.existsSync(`${root}/.metis`) || fs.existsSync(`${root}/.pca`);
  const pipeline = scanWorkflow(root, { includeHistory: false });
  assert.ok(Array.isArray(pipeline.evidence));
  assert.ok(pipeline.evidence.length > 0);
  assert.strictEqual(fs.existsSync(`${root}/.metis`), before);
});
