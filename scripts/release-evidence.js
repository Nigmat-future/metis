#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
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

const COMMANDS = [
  'npm run check',
  'npm run smoke:install',
  'npm run qa:product',
  'npm pack --dry-run',
];

function main() {
  const entries = [];
  const artifactPaths = [];
  for (const command of COMMANDS) {
    const startedAt = new Date().toISOString();
    const start = Date.now();
    const result = spawnSync(command, { cwd: ROOT, encoding: 'utf8', shell: true });
    const durationMs = Date.now() - start;
    const slug = command.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    const stdoutPath = path.join(EVIDENCE_DIR, `release-${slug}.stdout.txt`);
    const stderrPath = path.join(EVIDENCE_DIR, `release-${slug}.stderr.txt`);
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
    fs.writeFileSync(stdoutPath, result.stdout || '', 'utf8');
    fs.writeFileSync(stderrPath, result.stderr || '', 'utf8');
    artifactPaths.push(stdoutPath, stderrPath);
    const payload = `${result.stdout || ''}${result.stderr || ''}`;
    scanForCanaries(payload, command);
    entries.push({
      command,
      status: result.status === 0 ? 'pass' : 'fail',
      exitCode: result.status ?? 1,
      stdoutPath: rel(stdoutPath),
      stderrPath: rel(stderrPath),
      artifacts: [rel(stdoutPath), rel(stderrPath)],
      sha256: crypto.createHash('sha256').update(payload).digest('hex'),
      startedAt,
      durationMs,
      platform: process.platform,
      nodeVersion: process.version,
      redactionStatus: 'clean',
    });
    if (result.status !== 0) {
      writeIndex(entries);
      process.stderr.write(`release evidence failed on: ${command}\n`);
      process.exit(1);
    }
  }
  writeIndex(entries);
  for (const artifactPath of artifactPaths) scanForCanaries(fs.readFileSync(artifactPath, 'utf8'), rel(artifactPath));
  process.stdout.write('release evidence index generated\n');
}

function scanForCanaries(text, label) {
  for (const canary of CANARIES) {
    if (new RegExp(canary, 'i').test(text)) {
      throw new Error(`release evidence canary leak in ${label}: ${canary}`);
    }
  }
}

function writeIndex(entries) {
  const index = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    entries,
  };
  const indexPath = path.join(EVIDENCE_DIR, 'release-product-grade-index.json');
  const indexText = `${JSON.stringify(index, null, 2)}\n`;
  scanForCanaries(indexText, 'release index');
  fs.writeFileSync(indexPath, indexText, 'utf8');
  const summary = [
    '# Metis Product-Grade Release Evidence',
    '',
    `Generated: ${index.generatedAt}`,
    '',
    ...entries.map((entry) => `- ${entry.command}: ${entry.status} (exit ${entry.exitCode}, ${entry.durationMs}ms)`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'release-product-grade-summary.md'), summary, 'utf8');
}

function rel(absolutePath) {
  return path.relative(ROOT, absolutePath).replace(/\\/g, '/');
}

main();
