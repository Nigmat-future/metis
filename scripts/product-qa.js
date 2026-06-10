#!/usr/bin/env node

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const EVIDENCE_DIR = path.join(ROOT, '.omo', 'evidence');
const CANARIES = [
  'sk-pca-fake-secret',
  'ghp_abcdefghijklmnopqrstuvwxyz123456',
  'internal.customer.example',
  'VeryPrivateName',
];

function main() {
  const scenarios = [];
  const mixedFixture = path.join(ROOT, 'test', 'fixtures', 'mixed-agent-project');
  const sensitiveFixture = path.join(ROOT, 'test', 'fixtures', 'sensitive-metadata-project');
  const tempRoot = copyFixture(mixedFixture);

  try {
    scenarios.push(runScenario('cli-scan', ['scan', '--fixture', tempRoot]));
    scenarios.push(runScenario('cli-plan', ['plan', '--fixture', tempRoot]));
    scenarios.push(runScenario('cli-init-dry-run', ['init', '--dry-run', '--fixture', tempRoot]));
    scenarios.push(runScenario('cli-evolve-dry-run', ['evolve', '--dry-run', '--fixture', tempRoot]));
    scenarios.push(runScenario('cli-proposal-save', ['evolve', '--save-proposal', '--yes', '--fixture', tempRoot]));
    scenarios.push(runScenario('tui-dry-run', ['tui', '--fixture', tempRoot, '--script', path.join(ROOT, 'test', 'fixtures', 'tui', 'dry-run.txt')]));
    scenarios.push(runScenario('tui-width-welcome', ['tui', '--fixture', tempRoot, '--script', path.join(ROOT, 'test', 'fixtures', 'tui', 'v3-welcome.txt')]));
    scenarios.push(runScenario('tui-proposal', ['tui', '--fixture', tempRoot, '--script', path.join(ROOT, 'test', 'fixtures', 'tui', 'proposal-happy.txt')]));

    const guiOut = path.join(EVIDENCE_DIR, `task-12-gui-${Date.now()}.html`);
    scenarios.push(runScenario('gui-preview', ['gui', '--preview', '--fixture', tempRoot, '--out', guiOut]));
    assertNoCanaries(fs.readFileSync(guiOut, 'utf8'), guiOut);

    scenarios.push(runScenario('sensitive-scan', ['scan', '--fixture', sensitiveFixture]));
    const sensitiveTui = runScenario('sensitive-tui', ['tui', '--fixture', sensitiveFixture, '--script', path.join(ROOT, 'test', 'fixtures', 'tui', 'sensitive.txt')]);
    assert.strictEqual(sensitiveTui.exitCode, 1);
    scenarios.push(sensitiveTui);

    const summary = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      scenarios: scenarios.map((item) => ({ name: item.name, status: item.exitCode === 0 || item.name === 'sensitive-tui' ? 'pass' : 'fail', exitCode: item.exitCode })),
    };
    const out = path.join(EVIDENCE_DIR, 'task-12-product-qa-summary.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    const failed = summary.scenarios.filter((item) => item.status === 'fail');
    if (failed.length) {
      process.stderr.write(`product QA failed: ${failed.map((item) => item.name).join(', ')}\n`);
      process.exit(1);
    }
    process.stdout.write('product QA passed\n');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function runScenario(name, args) {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'bin', 'metis.js'), ...args], { cwd: ROOT, encoding: 'utf8' });
  const artifact = path.join(EVIDENCE_DIR, `task-12-${name}.txt`);
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(artifact, `${result.stdout}${result.stderr}`, 'utf8');
  assertNoCanaries(`${result.stdout}${result.stderr}`, artifact);
  return { name, exitCode: result.status ?? 1 };
}

function copyFixture(source) {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-qa-'));
  fs.cpSync(source, target, { recursive: true });
  return target;
}

function assertNoCanaries(text, label) {
  for (const canary of CANARIES) {
    if (new RegExp(canary, 'i').test(text)) throw new Error(`canary leaked in ${label}: ${canary}`);
  }
}

main();
