#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TARGETS = ['bin', 'lib', 'scripts'];
const PATTERNS = [
  /node:(?:http|https|net|tls)\b/,
  /require\(['"](?:http|https|net|tls)['"]\)/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /telemetry/i,
  /analytics\.track/i,
];
const ALLOWLIST = [
  /no\s+remote/i,
  /no\s+telemetry/i,
  /telemetry\s+disabled/i,
  /telemetry:/i,
  /safety\.telemetry/i,
  /\/telemetry/i,
  /signals\.push/i,
  /forbidden/i,
  /guardrail/i,
  /PRODUCT-GRADE/i,
  /PATTERNS\s*=/i,
  /ALLOWLIST/i,
  /check-no-network/i,
];

function main() {
  const issues = [];
  for (const target of TARGETS) {
    walk(path.join(ROOT, target), (file) => {
      const source = fs.readFileSync(file, 'utf8');
      for (const pattern of PATTERNS) {
        if (!pattern.test(source)) continue;
        const lines = source.split(/\r?\n/);
        lines.forEach((line, index) => {
          if (!pattern.test(line)) return;
          if (path.basename(file) === 'check-no-network.js') return;
          if (ALLOWLIST.some((rule) => rule.test(line))) return;
          issues.push(`${path.relative(ROOT, file)}:${index + 1}: ${pattern}`);
        });
      }
    });
  }
  if (issues.length) {
    process.stderr.write(`${issues.join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write('no-network check passed\n');
}

function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, onFile);
    else if (entry.isFile() && entry.name.endsWith('.js')) onFile(full);
  }
}

main();
