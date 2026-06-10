const { safeListFiles, safeReadJsonShape, safeReadTextFile } = require('../core/fs-safe');
const { sanitizeJsonKey } = require('../core/display');

function scan(context) {
  addInstructionEvidence(context, 'CLAUDE.md');
  addJsonShapeEvidence(context, '.claude/settings.json', 'settings', 'Claude Code settings shape');
  addJsonShapeEvidence(context, '.claude/mcp.json', 'mcp', 'Claude Code MCP shape');
  scanCountedDirectory(context, '.claude/hooks', 'hooks', 'hook file(s)', ['hook-workflow']);
  scanCountedDirectory(context, '.claude/skills', 'skills', 'skill file(s)', ['instruction-rule']);
  if (context.options.includeHistory) scanHistory(context);
}

function addInstructionEvidence(context, relativePath) {
  const read = safeReadTextFile(context.root, relativePath);
  if (read.status === 'missing') return;
  const redacted = context.redactor.redact(read.text || '');
  context.builder.addEvidence({
    source: 'claude-code',
    adapter: 'claude-code',
    kind: 'instruction-file',
    rootRelativePath: relativePath,
    status: read.status,
    summary: 'Claude Code project instruction file present',
    confidence: 0.75,
    sensitivity: 'metadata',
    sizeBytes: read.size || 0,
    signals: instructionSignals(redacted.text),
    risks: risksFromRedactions(redacted.redactions),
    redactions: redacted.redactions,
    targets: ['CLAUDE.md', 'AGENTS.md'],
  });
}

function addJsonShapeEvidence(context, relativePath, kind, summary) {
  const shape = safeReadJsonShape(context.root, relativePath);
  if (shape.status === 'missing') return;
  const keys = shape.keys.map(sanitizeJsonKey);
  const risks = risksFromShape(kind, shape, keys);
  context.builder.addEvidence({
    source: 'claude-code',
    adapter: 'claude-code',
    kind,
    rootRelativePath: relativePath,
    status: shape.status === 'present' ? 'present' : shape.status,
    summary: jsonSummary(summary, shape, keys),
    confidence: shape.status === 'present' ? 0.7 : 0.35,
    sensitivity: 'metadata',
    sizeBytes: shape.size || 0,
    signals: kind === 'mcp' || shape.hasMcpShape ? ['mcp-usage'] : ['tool-permission'],
    risks,
    targets: kind === 'mcp' ? ['CLAUDE.md'] : ['CLAUDE.md', 'AGENTS.md'],
    details: { keys },
  });
}

function scanCountedDirectory(context, relativePath, kind, label, signals) {
  const listed = safeListFiles(context.root, relativePath, { maxDepth: 5 });
  if (listed.status === 'missing') return;
  const suffix = listed.skippedSymlinks ? `, ${listed.skippedSymlinks} symlink skipped` : '';
  context.builder.addEvidence({
    source: 'claude-code',
    adapter: 'claude-code',
    kind,
    rootRelativePath: relativePath,
    status: listed.status,
    summary: `${listed.files.length} ${label}${suffix}`,
    confidence: 0.65,
    sensitivity: 'metadata',
    signals,
    risks: listed.skippedSymlinks ? ['symlink-skipped'] : [],
    targets: ['CLAUDE.md'],
    details: { count: String(listed.files.length), symlinks: String(listed.skippedSymlinks) },
  });
}

function scanHistory(context) {
  const listed = safeListFiles(context.root, '.claude/sessions', { maxDepth: 5 });
  if (listed.status === 'missing') return;
  for (const relativePath of listed.files.slice(0, 20)) {
    const read = safeReadTextFile(context.root, relativePath);
    if (read.status !== 'present') continue;
    const redactedPath = context.redactor.redactPath(relativePath);
    const redacted = context.redactor.redact(read.text);
    context.builder.addEvidence({
      source: 'claude-code',
      adapter: 'claude-code',
      kind: 'history-snippet',
      rootRelativePath: relativePath,
      status: 'present',
      summary: `Redacted bounded history snippet from ${redactedPath.text}`,
      confidence: 0.55,
      sensitivity: 'redacted-content',
      sizeBytes: read.size || 0,
      signals: ['instruction-rule'],
      risks: risksFromRedactions(redacted.redactions),
      redactions: redacted.redactions,
      targets: ['CLAUDE.md', 'AGENTS.md'],
      excerpt: redacted.text.slice(0, 160),
    });
  }
}

function jsonSummary(label, shape, keys) {
  if (shape.status === 'present') return `${label} parsed; top-level keys: ${keys.length ? keys.join(', ') : 'none'}`;
  if (shape.status === 'too-large') return `${label} skipped: file too large`;
  if (shape.status === 'parse-failed') return `${label} parse failed`;
  return `${label} ${shape.status}`;
}

function risksFromRedactions(redactions) {
  return redactions.some((item) => item.type === 'prompt-injection') ? ['prompt-injection'] : [];
}

function risksFromShape(kind, shape, keys) {
  const risks = [];
  if (keys.includes('[redacted-key]')) risks.push('sensitive-metadata');
  if (kind === 'mcp' && hasBroadFilesystemAccess(shape.value)) risks.push('broad-filesystem-access');
  return risks;
}

function hasBroadFilesystemAccess(value) {
  if (!value || typeof value !== 'object') return false;
  const servers = value.mcpServers;
  if (!servers || typeof servers !== 'object') return false;
  return Object.values(servers).some((server) => serverHasBroadFilesystemAccess(server));
}

function serverHasBroadFilesystemAccess(server) {
  if (!server || typeof server !== 'object') return false;
  const command = String(server.command || '');
  const args = Array.isArray(server.args) ? server.args.map((item) => String(item)) : [];
  if (/filesystem/i.test(command) && args.some((item) => isBroadFilesystemTarget(item))) return true;
  return args.some((item) => /filesystem/i.test(item) && isBroadFilesystemTarget(item));
}

function isBroadFilesystemTarget(value) {
  const normalized = String(value || '').trim().replace(/^["']|["']$/g, '');
  return /^(?:[A-Za-z]:\\|\/)$/.test(normalized);
}

function instructionSignals(text) {
  const signals = ['instruction-rule'];
  if (/Chinese|中文|简体/i.test(text)) signals.push('language-preference');
  if (/test|verify|verification/i.test(text)) signals.push('verification-command');
  if (/secret|privacy|private|redact|telemetry/i.test(text)) signals.push('privacy-rule');
  return signals;
}

module.exports = { id: 'claude-code', name: 'Claude Code', scan };
