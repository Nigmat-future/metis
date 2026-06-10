#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DOC_FILES = [
  'docs/PRODUCT-GRADE.md',
  'docs/PRD.md',
  'docs/ARCHITECTURE.md',
  'README.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
].map((relativePath) => path.join(ROOT, relativePath));

const PENDING_MARKERS = [/TODO:\s*decide/i, /TBD\b/, /FIXME:\s*scope/i, /PENDING DECISION/i];
const README_OPENING_MARKERS = [
  'repeated AI coding corrections',
  'Before',
  'After',
  'personal',
  'local',
  'reviewable',
  'reversible',
];
const FORBIDDEN_PRODUCT_CLAIMS = [
  { pattern: /GUI\s+apply\s+button/i, message: 'forbidden GUI apply button product claim' },
  { pattern: /gui\s+can\s+apply/i, message: 'forbidden GUI apply claim' },
  { pattern: /localhost\s+server/i, message: 'forbidden localhost GUI server claim (except non-goal/guardrail)' },
  { pattern: /cloud\s+sync/i, message: 'forbidden cloud sync product claim' },
  { pattern: /chat\s+runtime/i, message: 'forbidden chat runtime product claim' },
];
const ALLOWED_CONTEXT = [
  /non-goal/i,
  /must not/i,
  /not a\s+chat\s+runtime/i,
  /does not/i,
  /no\s+localhost/i,
  /read-only/i,
  /guardrail/i,
  /forbidden/i,
  /^\s*-\s*no\b/i,
  /^\s*-\s*chat runtime/i,
  /^\s*-\s*cloud sync/i,
  /^\s*-\s*gui localhost/i,
  /^\s*-\s*no gui apply/i,
  /##\s*non-goals/i,
];

function main() {
  const targetRoot = process.argv[2] ? path.resolve(process.argv[2]) : ROOT;
  const files = process.argv[2]
    ? listMarkdown(path.join(targetRoot, 'docs')).concat(
      ['README.md', 'SECURITY.md', 'CONTRIBUTING.md'].map((name) => path.join(targetRoot, name)).filter((file) => fs.existsSync(file)),
    )
    : DOC_FILES;

  const issues = [];
  for (const file of files) {
    if (!fs.existsSync(file)) {
      issues.push(`${relative(file)}: missing required doc file`);
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    for (const marker of PENDING_MARKERS) {
      if (marker.test(text)) issues.push(`${relative(file)}: unresolved decision marker (${marker})`);
    }
    for (const claim of FORBIDDEN_PRODUCT_CLAIMS) {
      const matches = [...text.matchAll(new RegExp(claim.pattern.source, claim.pattern.flags.includes('g') ? claim.pattern.flags : `${claim.pattern.flags}g`))];
      for (const match of matches) {
        const line = lineAt(text, match.index);
        const section = sectionHeadingAt(text, match.index);
        const context = text.slice(Math.max(0, match.index - 80), match.index + 80);
        if (ALLOWED_CONTEXT.some((ctx) => ctx.test(line) || ctx.test(section) || ctx.test(context))) continue;
        if (/non-goal|must not have|does not/i.test(section)) continue;
        issues.push(`${relative(file)}: ${claim.message} -> ${line.trim()}`);
      }
    }
    if (path.basename(file) === 'README.md') {
      const missing = missingReadmeOpeningMarkers(text);
      if (missing.length) {
        issues.push(`${relative(file)}: README opening narrative missing markers: ${missing.join(', ')}`);
      }
    }
  }

  const baseline = path.join(targetRoot, 'docs/PRODUCT-GRADE.md');
  if (!fs.existsSync(baseline)) issues.push('docs/PRODUCT-GRADE.md: missing product-grade baseline');

  if (issues.length) {
    process.stderr.write(`${issues.join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(`doc consistency check passed (${files.length} files)\n`);
}

function listMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) files.push(path.join(dir, entry.name));
  }
  return files;
}

function lineAt(text, index) {
  const start = text.lastIndexOf('\n', index) + 1;
  const end = text.indexOf('\n', index);
  return text.slice(start, end === -1 ? undefined : end);
}

function sectionHeadingAt(text, index) {
  const before = text.slice(0, index);
  const headings = [...before.matchAll(/^#{1,3}\s+.+$/gm)];
  return headings.length ? headings[headings.length - 1][0] : '';
}

function missingReadmeOpeningMarkers(text) {
  const opening = text.split(/\r?\n/).slice(0, 60).join('\n');
  return README_OPENING_MARKERS.filter((marker) => !new RegExp(escapeRegExp(marker), 'i').test(opening));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function relative(file) {
  return path.relative(ROOT, file) || file;
}

main();
