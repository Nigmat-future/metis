#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const REQUIRED = ['bin/metis.js', 'bin/pca.js', 'lib/workflows/index.js', 'README.md', 'docs/PRODUCT-GRADE.md'];
const FORBIDDEN = ['.omo/evidence', '.omo/drafts', 'test/', 'screenshots'];

function main() {
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', shell: true });
  if (pack.status !== 0) {
    process.stderr.write(pack.stderr || pack.stdout);
    process.exit(1);
  }
  const parsed = JSON.parse(pack.stdout.trim());
  const entry = Array.isArray(parsed) ? parsed[0] : parsed;
  const files = (entry.files || []).map((item) => item.path.replace(/\\/g, '/'));
  const missing = REQUIRED.filter((item) => !files.some((file) => file === item || file.endsWith(`/${item}`)));
  const leaked = FORBIDDEN.filter((item) => files.some((file) => file.startsWith(item) || file.includes(`/${item}`)));
  if (missing.length || leaked.length) {
    if (missing.length) process.stderr.write(`missing from package: ${missing.join(', ')}\n`);
    if (leaked.length) process.stderr.write(`forbidden in package: ${leaked.join(', ')}\n`);
    process.exit(1);
  }
  const out = path.join(ROOT, '.omo', 'evidence', 'task-2-product-pack-allowlist.txt');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${files.sort().join('\n')}\n`, 'utf8');
  process.stdout.write(`package check passed (${files.length} files listed)\n`);
}

main();
