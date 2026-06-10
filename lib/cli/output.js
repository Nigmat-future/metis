const { summarizeEvidence } = require('../core/evidence');

function formatHelp(options = {}) {
  const brand = options.brand || 'metis';
  const lines = [
    `Usage: ${brand} <command> [options]`,
    '',
    'Commands:',
    '  tui                          Interactive terminal workflow (primary)',
    '  doctor                       Read-only project diagnostics',
    '  scan                         Scan local agent/project evidence',
    '  plan                         Print evidence-backed behavior candidates',
    '  init --dry-run               Print scaffold diffs without writing',
    '  init --apply --yes           Apply scaffold with rollback metadata',
    '  rollback <id>                Restore files from a rollback record',
    '  evolve --dry-run             Propose small updates without writing',
    '  evolve --save-proposal --yes Save redacted evolve proposal to .metis/proposals',
    '  proposal list                List saved evolve proposals',
    '  proposal inspect <id>        Inspect a saved proposal',
    '  proposal dismiss <id> --yes  Dismiss a proposal without scaffold writes',
    '  proposal accept <id> --dry-run | --apply --yes',
    '  gui --preview                Generate read-only HTML dashboard',
    '',
    'Options:',
    '  --fixture <path>             Use a deterministic local project root',
    '  --include-history            Opt in to bounded redacted history snippets',
    '  --json                       Print stable JSON for scan, plan, or gui',
    '  --script <path>              Scripted TUI input for tests',
    '  --out <path>                 Output path for gui --preview',
    '',
    'Local-first: no remote calls, no telemetry, no silent transcript reads.',
    '',
  ];
  if (brand === 'pca') {
    lines.push('Note: pca is a deprecated alias for metis. Prefer `metis` for new workflows.', '');
  }
  return lines.join('\n');
}

function formatScan(pipeline) {
  const summary = summarizeEvidence(pipeline.evidence);
  const lines = ['Metis: scanning local agent evidence...', '', 'Root: .', '', 'Found:'];
  if (!pipeline.evidence.length) lines.push('  No supported evidence found');
  for (const item of pipeline.evidence) {
    lines.push(`  ${item.id} ${item.source.padEnd(12)} ${item.kind.padEnd(20)} ${item.status} - ${item.summary}`);
  }
  lines.push(
    '',
    'Summary:',
    `  Evidence items   ${pipeline.evidence.length}`,
    `  Claude Code      ${summary.sources['claude-code'] || 0}`,
    `  Codex            ${summary.sources.codex || 0}`,
    `  Project          ${summary.sources.project || 0}`,
    `  History snippets ${summary.historySnippets}`,
    '  Content display  metadata and redacted excerpts only',
    '',
    'Redaction:',
    '  raw values       not displayed',
    '  hooks/skills     counted only, never executed',
    '  remote calls     disabled',
    '  telemetry        disabled',
    '',
    'Writes: none',
    '',
  );
  return lines.join('\n');
}

function formatPlan(pipeline) {
  const lines = ['Extracted behavior candidates:', ''];
  if (!pipeline.candidates.length) lines.push('  No supported evidence found for behavior candidates.', '');
  for (const candidate of pipeline.candidates) {
    lines.push(`  [${candidate.confidence} confidence] ${candidate.title}`);
    lines.push(`    Evidence: ${candidate.evidenceIds.join(', ')}`);
    lines.push(`    Proposed target: ${candidate.targets.join(', ') || 'none'}`);
    lines.push(`    Risk: ${candidate.risk}`);
    lines.push(`    Decision: ${candidate.decision}`);
    if (candidate.reviewReason) lines.push(`    Review: ${candidate.reviewReason}`);
    lines.push('');
  }
  const quality = pipeline.ruleQuality;
  if (quality) {
    lines.push('Rule quality:');
    lines.push(`  ${quality.summary.pass}/${quality.summary.total} personal rules pass`);
    lines.push(`  ${quality.summary.needsReview} need review for length, vagueness, duplication, or conflict`);
    lines.push('');
  }
  lines.push('Safety audit:');
  if (!pipeline.audit.issues.length) {
    lines.push('  No blocking issues found.');
  } else {
    for (const issue of pipeline.audit.issues) lines.push(`  [${issue.severity}] ${issue.message}`);
  }
  lines.push('', 'Writes: none', '');
  return lines.join('\n');
}

module.exports = { formatHelp, formatPlan, formatScan };
