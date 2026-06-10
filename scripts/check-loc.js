#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const MAX_LOC = Number(process.env.METIS_MAX_LOC || 250);
const TARGETS = ['bin', 'lib', 'scripts'];

function main() {
  const offenders = [];
  let max = 0;
  for (const target of TARGETS) {
    walk(path.join(ROOT, target), (file) => {
      const loc = pureLoc(fs.readFileSync(file, 'utf8'));
      max = Math.max(max, loc);
      if (loc > MAX_LOC) offenders.push({ file: path.relative(ROOT, file), loc });
    });
  }
  if (offenders.length) {
    for (const item of offenders) process.stderr.write(`${item.file}: ${item.loc} pure LOC (max ${MAX_LOC})\n`);
    process.exit(1);
  }
  process.stdout.write(`loc check passed (max pure LOC ${max}, limit ${MAX_LOC})\n`);
}

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else if (entry.isFile() && entry.name.endsWith('.js')) onFile(full);
  }
}

function pureLoc(source) {
  return source
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && trimmed !== '*/' && trimmed !== '*';
    }).length;
}

main();
