const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { copyFixtureToTemp, fixturePath, snapshotFiles } = require('./helpers/fixtures');

const cli = path.join(__dirname, '..', 'bin', 'pca.js');
const repoRoot = path.join(__dirname, '..');

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: 'utf8' });
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test('codex AGENTS content derives language and verification candidates', () => {
  const result = run(['plan', '--fixture', fixturePath('codex-project')]);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Respond in Simplified Chinese when instructed/);
  assert.match(result.stdout, /Run npm test before final answer/);
});

test('evolve dry-run blocks high-risk evidence', () => {
  const result = run(['evolve', '--dry-run', '--fixture', fixturePath('sensitive-metadata-project')]);

  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /Safety audit failed/);
});

test('evolve proposals include evidence ids and per-change token impact', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const apply = run(['init', '--apply', '--yes', '--fixture', root]);
  assert.strictEqual(apply.status, 0, output(apply));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    scripts: { test: 'node --test', lint: 'node --check index.js' },
  }));
  const before = snapshotFiles(root);

  const result = run(['evolve', '--dry-run', '--fixture', root]);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Evidence: ev_/);
  assert.match(result.stdout, /Token impact:/);
  assert.deepStrictEqual(snapshotFiles(root), before);
});

test('adapter scanAll returns real evidence instead of adapter warnings', () => {
  const { scanAll } = require('../lib/adapters');

  const result = scanAll(fixturePath('mixed-agent-project'));

  assert.ok(result.evidence.some((item) => item.source === 'claude-code' && item.kind === 'instruction-file'));
  assert.ok(result.evidence.some((item) => item.source === 'codex' && item.kind === 'instruction-file'));
  assert.ok(result.evidence.some((item) => item.source === 'project' && item.kind === 'project-script'));
  assert.strictEqual(result.evidence.some((item) => item.kind === 'adapter-warning'), false);
});

test('broad MCP filesystem permission blocks generation', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  fs.writeFileSync(path.join(root, '.claude', 'mcp.json'), JSON.stringify({
    mcpServers: {
      filesystem: {
        command: 'filesystem-server',
        args: ['C:\\'],
      },
    },
  }));

  const result = run(['init', '--dry-run', '--fixture', root]);

  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /Safety audit failed/);
});

test('workflow exposes rule quality summary for generated candidates', () => {
  const { buildPipeline } = require('../lib/workflows');

  const pipeline = buildPipeline(fixturePath('mixed-agent-project'));

  assert.ok(pipeline.ruleQuality);
  assert.strictEqual(pipeline.ruleQuality.summary.total, pipeline.candidates.length);
  assert.strictEqual(
    pipeline.ruleQuality.summary.pass + pipeline.ruleQuality.summary.needsReview,
    pipeline.ruleQuality.summary.total,
  );
  assert.ok(pipeline.candidates.every((candidate) => candidate.quality));
});

test('plan output prints concise rule quality summary', () => {
  const result = run(['plan', '--fixture', fixturePath('mixed-agent-project')]);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Rule quality:/);
  assert.match(result.stdout, /\d+\/\d+ personal rules pass/);
  assert.match(result.stdout, /need review for length, vagueness, duplication, or conflict/);
  assert.match(result.stdout, /Rule quality:[\s\S]+Safety audit:/);
});
