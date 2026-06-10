#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function run(command) {
  const result = spawnSync(command, { cwd: ROOT, encoding: 'utf8', shell: true, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function main() {
  const hasLock = require('node:fs').existsSync(path.join(ROOT, 'package-lock.json'));
  run(hasLock ? 'npm ci' : 'npm install');
  run('npm run check');
  run('npm run smoke:install');
  run('npm run qa:product');
  run('npm run evidence:release');
  process.stdout.write('local CI passed\n');
}

main();
