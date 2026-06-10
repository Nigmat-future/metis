const { safeListFiles, safeReadJsonShape, safeReadTextFile } = require('../core/fs-safe');
const { sanitizeJsonKey } = require('../core/display');

const LOCKFILES = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'];

function scan(context) {
  scanPackageJson(context);
  scanMakefile(context);
  scanDocs(context);
  scanLockfiles(context);
}

function scanPackageJson(context) {
  const shape = safeReadJsonShape(context.root, 'package.json');
  if (shape.status === 'missing') return;
  const read = safeReadTextFile(context.root, 'package.json');
  const keys = shape.keys.map(sanitizeJsonKey);
  context.builder.addEvidence({
    source: 'project',
    adapter: 'project',
    kind: 'package',
    rootRelativePath: 'package.json',
    status: shape.status === 'present' ? 'present' : shape.status,
    summary: `package.json shape; top-level keys: ${keys.join(', ') || 'none'}`,
    confidence: shape.status === 'present' ? 0.7 : 0.3,
    sensitivity: 'metadata',
    signals: ['project-config'],
    risks: [],
    targets: ['AGENTS.md', 'CLAUDE.md'],
    details: { keys },
  });
  if (read.status === 'present') addScriptEvidence(context, read.text);
}

function addScriptEvidence(context, text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (_) {
    return;
  }
  const scripts = value && typeof value.scripts === 'object' && !Array.isArray(value.scripts) ? value.scripts : {};
  for (const name of Object.keys(scripts).sort()) {
    const command = String(scripts[name]);
    const redacted = context.redactor.redact(command);
    context.builder.addEvidence({
      source: 'project',
      adapter: 'project',
      kind: 'project-script',
      rootRelativePath: 'package.json',
      status: 'present',
      summary: `package script ${sanitizeJsonKey(name)}: ${redacted.text}`,
      confidence: scriptConfidence(name),
      sensitivity: 'metadata',
      signals: scriptSignals(name),
      risks: risksFromScript(command, redacted),
      redactions: redacted.redactions,
      targets: ['AGENTS.md', 'CLAUDE.md'],
      details: { script: sanitizeJsonKey(name), command: redacted.text },
    });
  }
}

function scanMakefile(context) {
  const read = safeReadTextFile(context.root, 'Makefile');
  if (read.status === 'missing') return;
  context.builder.addEvidence({
    source: 'project',
    adapter: 'project',
    kind: 'makefile',
    rootRelativePath: 'Makefile',
    status: read.status,
    summary: 'Makefile present; content not displayed',
    confidence: 0.5,
    sensitivity: 'metadata',
    signals: ['build-command'],
    risks: [],
    targets: ['AGENTS.md', 'CLAUDE.md'],
  });
}

function scanDocs(context) {
  addDocEvidence(context, 'README.md');
  const listed = safeListFiles(context.root, 'docs', { maxDepth: 2 });
  if (listed.status === 'missing') return;
  context.builder.addEvidence({
    source: 'project',
    adapter: 'project',
    kind: 'project-doc',
    rootRelativePath: 'docs',
    status: listed.status,
    summary: `${listed.files.length} docs file(s) present`,
    confidence: 0.4,
    sensitivity: 'metadata',
    signals: ['project-config'],
    risks: [],
    targets: ['AGENTS.md'],
  });
}

function addDocEvidence(context, relativePath) {
  const read = safeReadTextFile(context.root, relativePath, 512);
  if (read.status === 'missing') return;
  context.builder.addEvidence({
    source: 'project',
    adapter: 'project',
    kind: 'project-doc',
    rootRelativePath: relativePath,
    status: read.status,
    summary: `${relativePath} present`,
    confidence: 0.4,
    sensitivity: 'metadata',
    signals: ['project-config'],
    risks: [],
    targets: ['AGENTS.md'],
  });
}

function scanLockfiles(context) {
  for (const relativePath of LOCKFILES) {
    const read = safeReadTextFile(context.root, relativePath, 1);
    if (read.status === 'missing') continue;
    context.builder.addEvidence({
      source: 'project',
      adapter: 'project',
      kind: 'lockfile',
      rootRelativePath: relativePath,
      status: read.status === 'too-large' ? 'present' : read.status,
      summary: `${relativePath} present`,
      confidence: 0.35,
      sensitivity: 'metadata',
      signals: ['project-config'],
      risks: [],
      targets: [],
    });
  }
}

function scriptConfidence(name) {
  return ['test', 'lint', 'build'].includes(name) ? 0.85 : 0.55;
}

function scriptSignals(name) {
  if (name === 'test') return ['verification-command'];
  if (name === 'lint') return ['lint-command'];
  if (name === 'build') return ['build-command'];
  return ['project-command'];
}

function risksFromScript(command, redacted) {
  const risky = isDestructiveCommand(command) || isRemotePipeCommand(command);
  return [...(risky ? ['dangerous-command'] : []), ...redacted.redactions.map((item) => item.type)];
}

function isDestructiveCommand(command) {
  return /\b(rm\s+-rf|del\s+\/s|Remove-Item\s+-Recurse|git\s+reset\s+--hard|chmod\s+-R|chown\s+-R)\b/i.test(command);
}

function isRemotePipeCommand(command) {
  return /\b(?:curl|wget)\b[\s\S]{0,200}\|\s*(?:bash|sh|zsh|fish|powershell|pwsh)\b/i.test(command)
    || /\bInvoke-WebRequest\b[\s\S]{0,200}\|\s*(?:iex|Invoke-Expression)\b/i.test(command)
    || /\b(?:iwr|irm|Invoke-RestMethod)\b[\s\S]{0,200}\|\s*(?:iex|Invoke-Expression)\b/i.test(command)
    || /\b(?:powershell|pwsh)(?:\.exe)?\b[\s\S]{0,120}-(?:e|enc|encodedcommand)\b/i.test(command);
}

module.exports = { id: 'project', name: 'Project', scan };
