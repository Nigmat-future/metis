const path = require('node:path');
const { safeListFiles, safeReadJsonShape, safeReadTextFile } = require('../core/fs-safe');
const { sanitizeJsonKey } = require('../core/display');

function scan(context) {
  scanAgentsFiles(context);
  scanCodexConfig(context);
  scanSessions(context);
}

function scanAgentsFiles(context) {
  const listed = safeListFiles(context.root, '.', { maxDepth: 5 });
  const agents = listed.files.filter((file) => path.basename(file) === 'AGENTS.md');
  for (const relativePath of agents) {
    const read = safeReadTextFile(context.root, relativePath);
    if (read.status !== 'present') continue;
    const redacted = context.redactor.redact(read.text);
    context.builder.addEvidence({
      source: 'codex',
      adapter: 'codex',
      kind: 'instruction-file',
      rootRelativePath: relativePath,
      status: 'present',
      summary: `Codex instruction file at depth ${depthOf(relativePath)}`,
      confidence: 0.78,
      sensitivity: 'redacted-content',
      sizeBytes: read.size || 0,
      signals: instructionSignals(redacted.text),
      risks: risksFromRedactions(redacted.redactions),
      redactions: redacted.redactions,
      targets: ['AGENTS.md', 'CLAUDE.md'],
      excerpt: instructionExcerpt(redacted.text),
      details: {
        depth: String(depthOf(relativePath)),
        cues: instructionCues(redacted.text),
      },
    });
  }
}

function scanCodexConfig(context) {
  const jsonShape = safeReadJsonShape(context.root, '.codex/config.json');
  if (jsonShape.status !== 'missing') addConfigEvidence(context, '.codex/config.json', jsonShape);
  const toml = safeReadTextFile(context.root, '.codex/config.toml');
  if (toml.status === 'missing') return;
  const redacted = context.redactor.redact(toml.text || '');
  context.builder.addEvidence({
    source: 'codex',
    adapter: 'codex',
    kind: 'settings',
    rootRelativePath: '.codex/config.toml',
    status: toml.status,
    summary: `Codex TOML config shape; keys: ${tomlKeys(redacted.text).join(', ') || 'none'}`,
    confidence: toml.status === 'present' ? 0.6 : 0.3,
    sensitivity: 'metadata',
    redactions: redacted.redactions,
    signals: ['tool-permission'],
    risks: risksFromRedactions(redacted.redactions),
    targets: ['AGENTS.md'],
  });
}

function addConfigEvidence(context, relativePath, shape) {
  const keys = shape.keys.map(sanitizeJsonKey);
  context.builder.addEvidence({
    source: 'codex',
    adapter: 'codex',
    kind: 'settings',
    rootRelativePath: relativePath,
    status: shape.status === 'present' ? 'present' : shape.status,
    summary: `Codex JSON config shape; top-level keys: ${keys.join(', ') || 'none'}`,
    confidence: shape.status === 'present' ? 0.6 : 0.3,
    sensitivity: 'metadata',
    signals: ['tool-permission'],
    risks: keys.includes('[redacted-key]') ? ['sensitive-metadata'] : [],
    targets: ['AGENTS.md'],
    details: { keys },
  });
}

function scanSessions(context) {
  const listed = safeListFiles(context.root, '.codex/sessions', { maxDepth: 5 });
  if (listed.status === 'missing') return;
  context.builder.addEvidence({
    source: 'codex',
    adapter: 'codex',
    kind: 'session-inventory',
    rootRelativePath: '.codex/sessions',
    status: listed.status,
    summary: `${listed.files.length} Codex session file(s), content not read by default`,
    confidence: 0.45,
    sensitivity: 'metadata',
    signals: ['history-inventory'],
    risks: (listed.skippedSymlinks || 0) ? ['symlink-skipped'] : [],
    targets: ['AGENTS.md'],
  });
  if (!context.options.includeHistory) return;
  for (const relativePath of listed.files.slice(0, 20)) addSessionSnippet(context, relativePath);
}

function addSessionSnippet(context, relativePath) {
  const read = safeReadTextFile(context.root, relativePath);
  if (read.status !== 'present') return;
  const redactedPath = context.redactor.redactPath(relativePath);
  const redacted = context.redactor.redact(read.text);
  context.builder.addEvidence({
    source: 'codex',
    adapter: 'codex',
    kind: 'history-snippet',
    rootRelativePath: relativePath,
    status: 'present',
    summary: `Redacted bounded Codex history snippet from ${redactedPath.text}`,
    confidence: 0.55,
    sensitivity: 'redacted-content',
    sizeBytes: read.size || 0,
    signals: ['instruction-rule'],
    risks: risksFromRedactions(redacted.redactions),
    redactions: redacted.redactions,
    targets: ['AGENTS.md', 'CLAUDE.md'],
    excerpt: redacted.text.slice(0, 160),
  });
}

function depthOf(relativePath) {
  return relativePath.split('/').length - 1;
}

function tomlKeys(text) {
  return [...text.matchAll(/^\s*([A-Za-z0-9_.-]+)\s*=/gm)].map((match) => sanitizeJsonKey(match[1])).slice(0, 12);
}

function risksFromRedactions(redactions) {
  return redactions.some((item) => item.type === 'prompt-injection') ? ['prompt-injection'] : [];
}

function instructionSignals(text) {
  const signals = ['instruction-rule'];
  if (/Chinese(?:-simplified)?|Simplified Chinese|中文|简体/i.test(text)) signals.push('language-preference');
  if (/\bnpm\s+test\b/i.test(text)) signals.push('verification-command');
  if (/local evidence|local-first|private|privacy|secret|redacted|telemetry/i.test(text)) signals.push('privacy-rule');
  return signals;
}

function instructionExcerpt(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 3).join(' ');
}

function instructionCues(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 3);
}

module.exports = { id: 'codex', name: 'Codex', scan };
