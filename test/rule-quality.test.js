const assert = require('node:assert');
const { test } = require('node:test');
const { assessRuleQuality } = require('../lib/planner/rule-quality');

test('rule quality flags vague overstuffed and impersonal rules', () => {
  const candidates = [{
    id: 'cand_000001',
    title: 'Overstuffed impersonal guidance',
    body: 'You are an autonomous agent that must always follow best practices and handle things appropriately as needed when possible while writing clean code for every system prompt interaction.',
  }];

  const quality = assessRuleQuality(candidates);

  assert.strictEqual(quality.summary.total, 1);
  assert.strictEqual(quality.summary.pass, 0);
  assert.strictEqual(quality.summary.needsReview, 1);
  assert.strictEqual(quality.items[0].candidateId, 'cand_000001');
  assert.strictEqual(quality.items[0].status, 'needs-review');
  assert.ok(quality.items[0].issues.every((issue) => typeof issue === 'string'));
  assert.match(quality.items[0].issues.join('; '), /overstuffed:/);
  assert.match(quality.items[0].issues.join('; '), /vague:/);
  assert.match(quality.items[0].issues.join('; '), /impersonal:/);
});

test('rule quality flags duplicates and contradictions without blocking generation globally', () => {
  const candidates = [
    {
      id: 'cand_000001',
      title: 'Run tests',
      body: 'Run npm test before reporting completion.',
    },
    {
      id: 'cand_000002',
      title: 'Run tests copy',
      body: 'Run npm test before reporting completion',
    },
    {
      id: 'cand_000003',
      title: 'Skip tests',
      body: 'Do not run npm test before reporting completion.',
    },
    {
      id: 'cand_000004',
      title: 'Keep notes local',
      body: 'Keep review notes local.',
    },
  ];

  const quality = assessRuleQuality(candidates);
  const byId = new Map(quality.items.map((item) => [item.candidateId, item]));

  assert.strictEqual(quality.summary.total, 4);
  assert.strictEqual(quality.summary.pass, 1);
  assert.strictEqual(quality.summary.needsReview, 3);
  assert.ok(quality.items.every((item) => item.issues.every((issue) => typeof issue === 'string')));
  assert.match(byId.get('cand_000002').issues.join('; '), /duplicate:/);
  assert.match(byId.get('cand_000003').issues.join('; '), /conflict:/);
  assert.strictEqual(byId.get('cand_000004').status, 'pass');
});
