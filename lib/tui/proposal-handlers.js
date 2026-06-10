const { APPLY_CONFIRM_TEXT } = require('./state');
const {
  dismissProposalWorkflow,
  inspectProposalWorkflow,
  listProposalsWorkflow,
  markProposalAppliedWorkflow,
  prepareProposalAcceptDryRun,
  resolveProposalId,
  saveEvolveProposalWorkflow,
} = require('../workflows/proposals');

const PROPOSAL_EVENTS = new Set([
  'save-proposal',
  'proposal-list',
  'proposal-inspect',
  'proposal-dismiss',
  'proposal-accept-dry-run',
  'proposal-accept-apply',
]);

function isProposalCommand(event) {
  return PROPOSAL_EVENTS.has(event);
}

function handleProposalCommand(machine, root, shell, parsed) {
  if (parsed.event === 'save-proposal') return handleSaveProposal(machine, root, shell, parsed);
  if (parsed.event === 'proposal-list') return handleProposalList(machine, root, shell);
  if (parsed.event === 'proposal-inspect') return handleProposalInspect(machine, root, shell, parsed.id);
  if (parsed.event === 'proposal-dismiss') return handleProposalDismiss(machine, root, shell, parsed);
  if (parsed.event === 'proposal-accept-dry-run') return handleProposalAcceptDryRun(machine, root, shell, parsed.id);
  return handleProposalAcceptApply(machine, root, shell, parsed.id);
}

function markAppliedProposal(root, shell) {
  if (!shell.pendingProposalApplyId) return { ok: true };
  const result = markProposalAppliedWorkflow(root, shell.pendingProposalApplyId);
  if (result.exitCode !== 0) {
    return { ok: false, message: result.stderr.trim(), hardFailure: true };
  }
  shell.pendingProposalApplyId = null;
  return { ok: true };
}

function handleSaveProposal(machine, root, shell, parsed) {
  if (!parsed.confirmed) {
    shell.message = 'type save-proposal --yes to confirm metadata write';
    return { ok: false, recoverable: true };
  }
  ensurePlan(machine);
  const result = saveEvolveProposalWorkflow(root, machine.getContext().pipeline);
  shell.message = result.exitCode === 0 ? 'proposal saved' : result.stderr.trim();
  if (result.exitCode === 0) {
    shell.showWelcome = false;
    machine.showProposalReview(result.stdout, result.proposalId);
  }
  return { ok: result.exitCode === 0 };
}

function handleProposalList(machine, root, shell) {
  const result = listProposalsWorkflow(root);
  shell.message = 'proposal list ready';
  machine.showProposalReview(result.stdout || result.stderr);
  return { ok: result.exitCode === 0 };
}

function handleProposalInspect(machine, root, shell, id) {
  try {
    const proposalId = resolveProposalId(root, id);
    const result = inspectProposalWorkflow(root, proposalId);
    shell.message = result.exitCode === 0 ? 'proposal inspect ready' : result.stderr.trim();
    machine.showProposalReview(result.exitCode === 0 ? result.stdout : result.stderr.trim(), proposalId);
    return { ok: result.exitCode === 0 };
  } catch (error) {
    shell.message = error.message;
    machine.showProposalReview(error.message);
    return { ok: false };
  }
}

function handleProposalDismiss(machine, root, shell, parsed) {
  if (!parsed.confirmed) {
    shell.message = 'type proposal-dismiss <id> --yes to confirm';
    return { ok: false, recoverable: true };
  }
  try {
    const proposalId = resolveProposalId(root, parsed.id);
    const result = dismissProposalWorkflow(root, proposalId);
    shell.message = result.exitCode === 0 ? 'proposal dismissed' : result.stderr.trim();
    machine.showProposalReview(result.exitCode === 0 ? result.stdout : result.stderr.trim(), result.exitCode === 0 ? proposalId : null);
    return { ok: result.exitCode === 0 };
  } catch (error) {
    shell.message = error.message;
    machine.showProposalReview(error.message);
    return { ok: false };
  }
}

function handleProposalAcceptDryRun(machine, root, shell, id) {
  const prepared = prepareProposalAcceptDryRun(root, id);
  if (!prepared.ok) {
    shell.message = prepared.message;
    machine.showProposalReview(prepared.message);
    return { ok: false };
  }
  shell.pendingProposalApplyId = prepared.proposalId;
  machine.setPipeline(prepared.pipeline);
  machine.setGenerated(prepared.generated);
  ensurePlan(machine);
  machine.transition('preview-diff');
  shell.message = 'proposal accept dry-run ready';
  return { ok: true };
}

function handleProposalAcceptApply(machine, root, shell, id) {
  const prepared = prepareProposalAcceptDryRun(root, id);
  if (!prepared.ok) {
    shell.message = prepared.message;
    return { ok: false };
  }
  shell.pendingProposalApplyId = prepared.proposalId;
  machine.setPipeline(prepared.pipeline);
  machine.setGenerated(prepared.generated);
  ensurePlan(machine);
  const preview = machine.transition('preview-diff');
  if (!preview.ok) {
    shell.message = preview.error || 'proposal accept blocked';
    return preview;
  }
  shell.pendingApply = true;
  shell.message = `type ${APPLY_CONFIRM_TEXT} to continue`;
  return { ok: true };
}

function ensurePlan(machine) {
  if (machine.getState() === 'scan-results') machine.transition('plan');
}

module.exports = { handleProposalCommand, isProposalCommand, markAppliedProposal };
