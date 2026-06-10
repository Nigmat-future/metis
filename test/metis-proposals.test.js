const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { copyFixtureToTemp } = require('./helpers/fixtures');
const { assertProposalWritePath, acquireLock, withArtifactLock } = require('../lib/core/artifact-store');
const { MAX_PROPOSAL_BYTES, makeProposalId, makeRollbackId } = require('../lib/core/artifacts');
const {
  buildProposalRecord,
  listProposals,
  readProposal,
  resolveProposalId,
  saveProposal,
  updateProposalStatus,
} = require('../lib/core/proposals');
const { buildEvolveChanges } = require('../lib/planner/evolve-changes');
const { readPrevious } = require('../lib/planner/evolve');
const { scanWorkflow } = require('../lib/workflows');

const CANARIES = [
  'sk-pca-fake-secret',
  'ghp_abcdefghijklmnopqrstuvwxyz123456',
  'internal.customer.example',
  'VeryPrivateName',
];

test('proposal record persists with lock and lists summaries', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const pipeline = scanWorkflow(root);
  const changes = buildEvolveChanges(pipeline, readPrevious(root));
  const record = buildProposalRecord(pipeline, changes);

  const saved = saveProposal(root, record);
  assert.strictEqual(saved.ok, true);
  assert.ok(fs.existsSync(path.join(root, saved.path)));

  const loaded = readProposal(root, record.id);
  assert.strictEqual(loaded.schemaVersion, 1);
  assert.strictEqual(loaded.status, 'pending');
  assert.strictEqual(loaded.redactionStatus, 'redacted');
  assert.ok(Array.isArray(loaded.changes));

  const { proposals, warnings } = listProposals(root);
  assert.strictEqual(proposals.length, 1);
  assert.strictEqual(warnings.length, 0);
  assert.strictEqual(proposals[0].id, record.id);
  assert.strictEqual(proposals[0].auditOk, pipeline.audit.ok);
});

test('proposal store rejects non-whitelisted paths and oversized payloads', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  assert.throws(
    () => assertProposalWritePath(root, '.metis/evidence/index.json'),
    /non-whitelisted/,
  );

  const pipeline = scanWorkflow(root);
  const record = buildProposalRecord(pipeline, []);
  record.changes = Array.from({ length: 4000 }, (_, index) => ({
    kind: 'add',
    title: `candidate-${index}`,
    evidenceIds: [],
    tokenImpact: 0,
    current: { title: `candidate-${index}`, decision: 'generate', risk: 'low', evidenceIds: [], targets: [], tokenCostEstimate: 999 },
    previous: null,
  }));

  assert.throws(() => saveProposal(root, record), /max size/);
  assert.ok(record.changes.length > 0);
  assert.ok(MAX_PROPOSAL_BYTES > 0);
});

test('artifact lock rejects concurrent holders', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  acquireLock(root);
  assert.throws(() => acquireLock(root), /already held/);
});

test('artifact lock recovers stale lock files', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const lockDir = path.join(root, '.metis');
  fs.mkdirSync(lockDir, { recursive: true });
  fs.writeFileSync(
    path.join(lockDir, '.lock'),
    `${JSON.stringify({ owner: 'metis', pid: 99999999, createdAt: new Date(0).toISOString() })}\n`,
    'utf8',
  );
  const lock = acquireLock(root);
  assert.ok(lock.ok);
});

test('listProposals reports unreadable records as warnings', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const dir = path.join(root, '.metis', 'proposals');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metis-proposal-bad.json'), '{ "schemaVersion": 9 }\n', 'utf8');
  const { proposals, warnings } = listProposals(root);
  assert.strictEqual(proposals.length, 0);
  assert.strictEqual(warnings.length, 1);
  assert.match(warnings[0].message, /malformed/);
});

test('resolveProposalId latest returns newest proposal by createdAt', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const pipeline = scanWorkflow(root);
  const changes = buildEvolveChanges(pipeline, readPrevious(root));
  const first = saveProposal(root, { ...buildProposalRecord(pipeline, changes), createdAt: '2020-01-01T00:00:00.000Z' });
  const second = saveProposal(root, buildProposalRecord(pipeline, changes));
  assert.strictEqual(resolveProposalId(root, 'latest'), second.id);
  assert.notStrictEqual(first.id, second.id);
});

test('artifact ids stay unique within the same millisecond', () => {
  const originalNow = Date.now;
  Date.now = () => 1700000000000;
  try {
    assert.notStrictEqual(makeProposalId(), makeProposalId());
    assert.notStrictEqual(makeRollbackId(), makeRollbackId());
  } finally {
    Date.now = originalNow;
  }
});

test('readProposal rejects oversized files', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const dir = path.join(root, '.metis', 'proposals');
  fs.mkdirSync(dir, { recursive: true });
  const id = 'metis-proposal-oversize';
  fs.writeFileSync(path.join(dir, `${id}.json`), `${'x'.repeat(MAX_PROPOSAL_BYTES + 64)}\n`, 'utf8');
  assert.throws(() => readProposal(root, id), /max size/);
});

test('saved proposals stay redacted without sensitive canaries', () => {
  const root = copyFixtureToTemp('sensitive-metadata-project');
  const pipeline = scanWorkflow(root);
  const record = buildProposalRecord(pipeline, buildEvolveChanges(pipeline, readPrevious(root)));
  saveProposal(root, record);
  const text = fs.readFileSync(path.join(root, '.metis', 'proposals', `${record.id}.json`), 'utf8');
  for (const canary of CANARIES) assert.doesNotMatch(text, new RegExp(canary, 'i'));
});

test('malformed proposal record fails validation on read', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const dir = path.join(root, '.metis', 'proposals');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'metis-proposal-bad.json'), '{ "schemaVersion": 9 }\n', 'utf8');
  assert.throws(() => readProposal(root, 'metis-proposal-bad'), /malformed/);
});

test('proposal status updates stay inside artifact lock', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const pipeline = scanWorkflow(root);
  const record = buildProposalRecord(pipeline, []);
  saveProposal(root, record);
  const updated = updateProposalStatus(root, record.id, 'dismissed');
  assert.strictEqual(updated.status, 'dismissed');
  assert.throws(() => updateProposalStatus(root, record.id, 'bogus'), /Invalid proposal status/);
});
