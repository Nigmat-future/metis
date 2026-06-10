const { generateScaffold } = require('../generator/scaffold');
const { buildEvolveChanges } = require('../planner/evolve-changes');
const { readPrevious } = require('../planner/evolve');
const {
  buildProposalRecord,
  hashEvidenceBaseline,
  listProposals,
  readProposal,
  resolveProposalId,
  saveProposal,
  updateProposalStatus,
} = require('../core/proposals');
const { applyWorkflow, scanWorkflow, stableJson } = require('./index');

function saveEvolveProposalWorkflow(root, pipeline) {
  if (!pipeline.audit.ok) {
    return { exitCode: 1, stdout: '', stderr: `${formatAuditFailure(pipeline.audit)}\n` };
  }
  const record = buildProposalRecord(pipeline, buildEvolveChanges(pipeline, readPrevious(root)));
  const saved = saveProposal(root, record);
  return {
    exitCode: 0,
    stdout: `Proposal saved: ${saved.id}\nPath: ${saved.path}\nChanges: ${record.changes.length}\nWrites: proposal metadata only\n`,
    stderr: '',
    proposalId: saved.id,
  };
}

function listProposalsWorkflow(root, options = {}) {
  const { proposals, warnings } = listProposals(root);
  if (options.json) {
    return { exitCode: 0, stdout: `${stableJson({ proposals, warnings })}\n`, stderr: '' };
  }
  const lines = ['Saved proposals:', ''];
  if (!proposals.length && !warnings.length) lines.push('  No saved proposals.');
  for (const item of proposals) {
    lines.push(`  ${item.id}  status=${item.status}  changes=${item.changeCount}  audit=${item.auditOk ? 'ok' : 'failed'}  created=${item.createdAt}`);
  }
  for (const warning of warnings) {
    lines.push(`  [unreadable] ${warning.id}: ${warning.message}`);
  }
  lines.push('');
  return { exitCode: 0, stdout: lines.join('\n'), stderr: '' };
}

function inspectProposalWorkflow(root, id, options = {}) {
  try {
    const record = readProposal(root, resolveProposalId(root, id));
    if (options.json) return { exitCode: 0, stdout: `${stableJson(record)}\n`, stderr: '' };
    const lines = [
      `Proposal: ${record.id}`,
      `Status: ${record.status}`,
      `Created: ${record.createdAt}`,
      `Baseline hash: ${record.baselineEvidenceHash}`,
      `Audit: ${record.audit.ok ? 'ok' : 'failed'}`,
      `Changes: ${record.changes.length}`,
      '',
      'Note: accept applies the current scan state and requires an unchanged evidence baseline.',
      '',
    ];
    for (const change of record.changes) {
      lines.push(`  [${change.kind}] ${change.title}  tokens=${change.tokenImpact}  evidence=${(change.evidenceIds || []).join(', ') || 'none'}`);
    }
    lines.push('');
    return { exitCode: 0, stdout: lines.join('\n'), stderr: '' };
  } catch (error) {
    return { exitCode: 1, stdout: '', stderr: `${error.message}\n` };
  }
}

function dismissProposalWorkflow(root, id) {
  try {
    const proposalId = resolveProposalId(root, id);
    const record = readProposal(root, proposalId);
    if (record.status === 'applied') {
      return { exitCode: 1, stdout: '', stderr: 'Applied proposals cannot be dismissed.\n' };
    }
    updateProposalStatus(root, proposalId, 'dismissed');
    return { exitCode: 0, stdout: `Proposal dismissed: ${proposalId}\nWrites: proposal status only\n`, stderr: '' };
  } catch (error) {
    return { exitCode: 1, stdout: '', stderr: `${error.message}\n` };
  }
}

function acceptProposalWorkflow(root, id, options = {}) {
  try {
    const proposalId = resolveProposalId(root, id);
    const preview = buildAcceptPreview(root, proposalId);
    if (options.dryRun) {
      updateProposalStatus(root, proposalId, 'accepted');
      return { exitCode: 0, stdout: `${preview.generated.diffText}\n`, stderr: '' };
    }
    if (options.apply && options.yes) {
      if (preview.record.status !== 'accepted') {
        return { exitCode: 1, stdout: '', stderr: 'Proposal must be accepted with --dry-run before --apply --yes.\n' };
      }
      const applied = applyWorkflow(root, preview.generated);
      if (!applied.ok) return { exitCode: applied.exitCode || 1, stdout: '', stderr: applied.stderr || `${applied.message}\n` };
      updateProposalStatus(root, proposalId, 'applied');
      return { exitCode: 0, stdout: applied.stdout, stderr: '' };
    }
    return { exitCode: 2, stdout: '', stderr: 'proposal accept requires --dry-run or --apply --yes\n' };
  } catch (error) {
    return { exitCode: 1, stdout: '', stderr: `${error.message}\n` };
  }
}

function prepareProposalAcceptDryRun(root, id) {
  try {
    const proposalId = resolveProposalId(root, id);
    const preview = buildAcceptPreview(root, proposalId);
    updateProposalStatus(root, proposalId, 'accepted');
    return {
      ok: true,
      generated: preview.generated,
      pipeline: preview.pipeline,
      proposalId,
      stdout: `${preview.generated.diffText}\n`,
    };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

function markProposalAppliedWorkflow(root, id) {
  try {
    const proposalId = resolveProposalId(root, id);
    updateProposalStatus(root, proposalId, 'applied');
    return { exitCode: 0, stdout: `Proposal applied: ${proposalId}\n`, stderr: '', proposalId };
  } catch (error) {
    return { exitCode: 1, stdout: '', stderr: `${error.message}\n` };
  }
}

function buildAcceptPreview(root, proposalId) {
  const record = readProposal(root, proposalId);
  if (record.status === 'dismissed') throw new Error('Proposal is dismissed.');
  if (record.status === 'applied') throw new Error('Proposal is already applied.');
  if (!record.audit.ok) throw new Error('Proposal audit failed; accept blocked.');
  const pipeline = scanWorkflow(root);
  if (!pipeline.audit.ok) throw new Error(formatAuditFailure(pipeline.audit));
  const currentHash = hashEvidenceBaseline(pipeline);
  if (currentHash !== record.baselineEvidenceHash) {
    throw new Error('Evidence baseline changed since proposal save; rescan and save a new proposal before accept.');
  }
  const generated = generateScaffold(pipeline);
  if (!generated.ok) throw new Error(generated.message);
  return { record, pipeline, generated };
}

function formatAuditFailure(audit) {
  return ['Safety audit failed.', '', ...audit.issues.map((issue) => `[${issue.severity}] ${issue.message}`), '', 'Writes: none'].join('\n');
}

module.exports = {
  acceptProposalWorkflow,
  buildAcceptPreview,
  dismissProposalWorkflow,
  hashEvidenceBaseline,
  inspectProposalWorkflow,
  listProposalsWorkflow,
  markProposalAppliedWorkflow,
  prepareProposalAcceptDryRun,
  resolveProposalId,
  saveEvolveProposalWorkflow,
};
