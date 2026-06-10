const { summarizeEvidence } = require('../core/evidence');
const { listJsonRecords } = require('../core/artifact-store');
const { METIS_ROLLBACK_DIR, LEGACY_PCA_ROLLBACK_DIR } = require('../core/artifacts');

function buildTuiViewModel(pipeline, generated, options = {}) {
  const summary = summarizeEvidence(pipeline.evidence);
  const auditOk = pipeline.audit.ok;
  const dryRunReady = Boolean(generated && generated.ok);
  return {
    brand: 'Metis',
    summary: {
      evidenceCount: pipeline.evidence.length,
      candidateCount: pipeline.candidates.length,
      auditOk,
      claudeCode: summary.sources['claude-code'] || 0,
      codex: summary.sources.codex || 0,
      project: summary.sources.project || 0,
      historySnippets: summary.historySnippets,
    },
    evidence: pipeline.evidence.map(toEvidenceRow),
    candidates: pipeline.candidates.map(toCandidateRow),
    audit: {
      ok: auditOk,
      issues: pipeline.audit.issues.map(toAuditRow),
    },
    diff: dryRunReady ? { available: true, preview: truncateDiff(generated.diffText) } : { available: false, preview: generated && !generated.ok ? 'blocked by safety audit' : '' },
    rollbackRecords: options.rollbackRecords || [],
    actions: buildTuiActions({ auditOk, dryRunReady }),
    welcome: options.welcome || null,
  };
}

function buildGuiViewModel(pipeline, generated, options = {}) {
  const root = pipeline.root;
  const rollbackRecords = options.rollbackRecords || listRollbackIds(root);
  const proposalSummaries = options.proposalSummaries || [];
  const tui = buildTuiViewModel(pipeline, generated, { rollbackRecords });
  const evolvePreview = buildEvolvePreview(pipeline);
  return {
    ...tui,
    dashboard: {
      title: 'Metis Review Dashboard',
      subtitle: 'Read-only snapshot. No apply or rollback controls.',
      sections: [
        { id: 'overview', label: 'Overview' },
        { id: 'evidence', label: 'Evidence' },
        { id: 'candidates', label: 'Candidates' },
        { id: 'audit', label: 'Safety Audit' },
        { id: 'diff', label: 'Diff Preview' },
        { id: 'rollback', label: 'Rollback Ledger' },
        { id: 'evolve', label: 'Evolve Proposal' },
      ],
    },
    evolvePreview,
    proposalSummaries,
    exportPayload: buildGuiExportPayload(tui, proposalSummaries, rollbackRecords, evolvePreview),
    actions: tui.actions.filter((action) => action.kind === 'read'),
  };
}

function buildGuiExportPayload(model, proposalSummaries, rollbackRecords, evolvePreview) {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    redactionStatus: 'redacted',
    summary: model.summary,
    evidence: model.evidence,
    candidates: model.candidates,
    audit: model.audit,
    diff: model.diff,
    rollbackRecords,
    proposalSummaries,
    evolvePreview: evolvePreview || null,
  };
}

function buildWelcomeHints(summary) {
  return {
    headline: 'Welcome to Metis',
    steps: [
      'Run plan to review behavior candidates',
      'Run preview-diff before any write',
      'Apply requires exact APPLY METIS after audit passes',
    ],
    safeNext: summary.evidenceCount ? 'plan' : 'rescan',
    doctorHint: 'metis doctor for diagnostics',
  };
}

function buildEvolvePreview(pipeline) {
  const generateCount = pipeline.candidates.filter((c) => c.decision === 'generate').length;
  const reviewCount = pipeline.candidates.length - generateCount;
  return {
    generateCount,
    reviewCount,
    note: 'Evolve proposals persist only after explicit save. This panel previews current candidate deltas.',
  };
}

function buildTuiActions({ auditOk, dryRunReady }) {
  const actions = [
    { id: 'scan', label: 'Rescan', kind: 'read' },
    { id: 'plan', label: 'View plan', kind: 'read' },
    { id: 'preview-diff', label: 'Diff Preview', kind: 'read' },
  ];
  if (auditOk && dryRunReady) {
    actions.push({ id: 'apply', label: 'Apply (requires APPLY METIS)', kind: 'write' });
  }
  actions.push({ id: 'rollback', label: 'Rollback', kind: 'write' });
  return actions;
}

function listRollbackIds(root) {
  try {
    return [
      ...listJsonRecords(root, METIS_ROLLBACK_DIR),
      ...listJsonRecords(root, LEGACY_PCA_ROLLBACK_DIR),
    ].sort();
  } catch (_) {
    return [];
  }
}

function toEvidenceRow(item) {
  return {
    id: item.id,
    source: item.source,
    kind: item.kind,
    status: item.status,
    summary: item.summary,
    displayPath: item.displayPath,
    risk: (item.risks && item.risks[0]) || 'none',
  };
}

function toCandidateRow(candidate) {
  return {
    id: candidate.id,
    title: candidate.title,
    confidence: candidate.confidence,
    evidenceIds: candidate.evidenceIds,
    targets: candidate.targets,
    risk: candidate.risk,
    decision: candidate.decision,
    reviewReason: candidate.reviewReason || null,
  };
}

function toAuditRow(issue) {
  return { severity: issue.severity, message: issue.message };
}

function truncateDiff(diffText, maxLines = 40) {
  const lines = String(diffText || '').split(/\r?\n/);
  if (lines.length <= maxLines) return lines.join('\n');
  return [...lines.slice(0, maxLines), '... (diff truncated)'].join('\n');
}

module.exports = {
  buildEvolvePreview,
  buildGuiExportPayload,
  buildGuiViewModel,
  buildTuiViewModel,
  buildWelcomeHints,
  listRollbackIds,
};
