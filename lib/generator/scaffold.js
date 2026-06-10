const { readExistingText } = require('../core/fs-safe');
const { auditAll } = require('../auditor/safety');
const {
  METIS_MARKER_BEGIN,
  METIS_MARKER_END,
  LEGACY_PCA_MARKER_BEGIN,
  LEGACY_PCA_MARKER_END,
  METIS_EVIDENCE_PATH,
  SCAFFOLD_TARGETS,
} = require('../core/artifacts');

const MARKER_BEGIN = METIS_MARKER_BEGIN;
const MARKER_END = METIS_MARKER_END;
const TARGETS = SCAFFOLD_TARGETS;

function generateScaffold(pipeline) {
  const files = buildFiles(pipeline);
  const audit = auditAll({ evidence: pipeline.evidence, candidates: pipeline.candidates, generatedFiles: files });
  if (!audit.ok) return { ok: false, message: formatAuditFailure(audit) };
  return { ok: true, files, diffText: formatDiffs(pipeline.root, files) };
}

function buildFiles(pipeline) {
  const active = pipeline.candidates.filter((candidate) => candidate.decision === 'generate').slice(0, 12);
  const review = pipeline.candidates.filter((candidate) => candidate.decision !== 'generate').slice(0, 12);
  const evidenceIndex = stableJson({
    schemaVersion: 1,
    evidence: pipeline.evidence,
    candidates: pipeline.candidates,
    audit: pipeline.audit,
  });
  return [
    managedMarkdown(pipeline.root, 'CLAUDE.md', active, review),
    managedMarkdown(pipeline.root, 'AGENTS.md', active, review),
    cursorRule(pipeline.root, active, review),
    { path: METIS_EVIDENCE_PATH, content: `${evidenceIndex}\n`, maxLines: 1000 },
  ];
}

function managedMarkdown(root, relativePath, active, review) {
  const existing = readExistingText(root, relativePath);
  const section = [
    METIS_MARKER_BEGIN,
    '# Metis Managed Personal Agent Rules',
    '',
    '## Active Rules',
    ...ruleLines(active),
    '',
    '## Review Notes',
    ...reviewLines(review),
    METIS_MARKER_END,
  ].join('\n');
  return { path: relativePath, content: mergeManagedSection(existing.content, section), maxLines: 80 };
}

function cursorRule(root, active, review) {
  const existing = readExistingText(root, '.cursor/rules/personal-agent.mdc');
  const section = [
    METIS_MARKER_BEGIN,
    'description: Metis managed personal coding agent rules',
    'alwaysApply: true',
    '',
    '# Personal Coding Agent',
    '',
    ...ruleLines(active),
    '',
    '## Review Only',
    ...reviewLines(review),
    METIS_MARKER_END,
  ].join('\n');
  return { path: '.cursor/rules/personal-agent.mdc', content: mergeManagedSection(existing.content, section), maxLines: 120 };
}

function mergeManagedSection(existing, section) {
  if (!existing) return `${section}\n`;
  const metisStart = existing.indexOf(METIS_MARKER_BEGIN);
  const metisEnd = existing.indexOf(METIS_MARKER_END);
  if (metisStart !== -1 && metisEnd !== -1 && metisEnd > metisStart) {
    return `${existing.slice(0, metisStart)}${section}${existing.slice(metisEnd + METIS_MARKER_END.length)}`;
  }
  const pcaStart = existing.indexOf(LEGACY_PCA_MARKER_BEGIN);
  const pcaEnd = existing.indexOf(LEGACY_PCA_MARKER_END);
  if (pcaStart !== -1 && pcaEnd !== -1 && pcaEnd > pcaStart) {
    return `${existing.slice(0, pcaStart)}${section}${existing.slice(pcaEnd + LEGACY_PCA_MARKER_END.length)}`;
  }
  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  return `${existing}${separator}${section}\n`;
}

function ruleLines(candidates) {
  if (!candidates.length) return ['- Keep this scaffold minimal until stronger evidence appears.'];
  return candidates.map((candidate) => `- ${candidate.body} (Evidence: ${candidate.evidenceIds.join(', ')})`);
}

function reviewLines(candidates) {
  if (!candidates.length) return ['- No review-only candidates.'];
  return candidates.map((candidate) => `- [${candidate.decision}] ${candidate.title} (Evidence: ${candidate.evidenceIds.join(', ')})`);
}

function formatDiffs(root, files) {
  const lines = ['No files changed.', '', 'Proposed scaffold diffs:', ''];
  for (const file of files) {
    const existing = readExistingText(root, file.path);
    lines.push(unifiedDiff(file.path, existing.exists ? existing.content : '', file.content), '');
  }
  lines.push('Writes: none', '');
  return lines.join('\n');
}

function unifiedDiff(relativePath, oldText, newText) {
  const oldLines = oldText ? oldText.split(/\r?\n/) : [];
  const newLines = newText.split(/\r?\n/);
  return [
    `--- a/${relativePath}`,
    `+++ b/${relativePath}`,
    '@@',
    ...oldLines.filter((line, index) => index < oldLines.length - 1 || line).map((line) => `-${line}`),
    ...newLines.filter((line, index) => index < newLines.length - 1 || line).map((line) => `+${line}`),
  ].join('\n');
}

function formatAuditFailure(audit) {
  return ['Safety audit failed; scaffold generation blocked.', '', ...audit.issues.map((issue) => `[${issue.severity}] ${issue.message}`), '', 'Writes: none', ''].join('\n');
}

function stableJson(value) {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = sortKeys(value[key]);
    return result;
  }, {});
}

module.exports = { MARKER_BEGIN, MARKER_END, TARGETS, generateScaffold };
