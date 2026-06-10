#!/usr/bin/env node

const fs = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TARGETS = ['bin', 'lib', 'scripts', 'test'];

function main() {
  const files = [];
  for (const target of TARGETS) collect(path.join(ROOT, target), files);
  let failed = 0;
  for (const file of files) {
    const result = fs.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      failed += 1;
      process.stderr.write(`${path.relative(ROOT, file)}: syntax check failed\n${result.stderr}`);
    }
  }
  if (failed) process.exit(1);
  process.stdout.write(`syntax check passed (${files.length} files)\n`);
}

function collect(dir, files) {
  if (!require('node:fs').existsSync(dir)) return;
  for (const entry of require('node:fs').readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full, files);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
}

main();
