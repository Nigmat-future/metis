const { createEvidenceBuilder, summarizeEvidence } = require('../core/evidence');
const { createRedactor } = require('../core/redactor');
const claudeCode = require('./claude-code');
const codex = require('./codex');
const project = require('./project');

const adapters = [claudeCode, codex, project];

function scanAll(root, options = {}) {
  const builder = createEvidenceBuilder({ redactor: createRedactor(), root });
  const warnings = collectEvidence(root, options, builder);
  const evidence = builder.finalize();
  return {
    displayRoot: '.',
    evidence,
    summaries: summarizeForScan(evidence),
    summary: summarizeEvidence(evidence),
    warnings,
  };
}

function collectEvidence(root, options, builder) {
  const warnings = [];
  const context = { root, options, redactor: createRedactor(), builder };
  for (const adapter of adapters) {
    try {
      adapter.scan(context);
    } catch (error) {
      warnings.push({
        adapter: adapter.id || 'unknown',
        message: error && error.message ? error.message : 'unknown error',
      });
    }
  }
  return warnings;
}

function summarizeForScan(evidence) {
  const specs = [
    ['CLAUDE.md', (item) => item.rootRelativePath === 'CLAUDE.md' && item.kind === 'instruction-file'],
    ['settings.json', (item) => item.rootRelativePath === '.claude/settings.json'],
    ['hooks', (item) => item.kind === 'hooks'],
    ['skills', (item) => item.kind === 'skills'],
    ['MCP config', (item) => item.kind === 'mcp'],
    ['AGENTS.md', (item) => item.rootRelativePath.endsWith('AGENTS.md')],
    ['package.json', (item) => item.kind === 'package'],
  ];
  return specs.map(([label, predicate]) => {
    const found = evidence.filter(predicate);
    return {
      detail: found.map((item) => item.summary).join('; '),
      label,
      status: found.length ? 'present' : 'not found',
    };
  });
}

module.exports = { adapters, scanAll };
