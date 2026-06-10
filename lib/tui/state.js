const STATES = {
  WELCOME: 'welcome',
  SCAN_RESULTS: 'scan-results',
  CANDIDATE_PLAN: 'candidate-plan',
  EVIDENCE_DETAIL: 'evidence-detail',
  AUDIT_DETAIL: 'audit-detail',
  DRY_RUN_DIFF: 'dry-run-diff',
  APPLY_CONFIRM: 'apply-confirm',
  APPLY_RESULT: 'apply-result',
  ROLLBACK_SELECT: 'rollback-select',
  ROLLBACK_RESULT: 'rollback-result',
  EVOLVE_PROPOSAL: 'evolve-proposal',
  ERROR: 'error',
};

const APPLY_CONFIRM_TEXT = 'APPLY METIS';

function createTuiStateMachine(workflows = {}) {
  const applyWorkflow = workflows.applyWorkflow || (() => ({ ok: true }));
  const rollbackWorkflow = workflows.rollbackWorkflow || (() => ({ ok: true }));
  const evolveWorkflow = workflows.evolveWorkflow || (() => ({ exitCode: 0, stdout: '' }));

  let state = STATES.WELCOME;
  const context = {
    pipeline: null,
    generated: null,
    selectedEvidenceId: null,
    selectedCandidateId: null,
    rollbackId: null,
    error: null,
    applyInvocations: 0,
    rollbackInvocations: 0,
    evolveInvocations: 0,
    lastApplyResult: null,
    lastRollbackResult: null,
    lastEvolveOutput: null,
    activeProposalId: null,
  };

  function getState() {
    return state;
  }

  function getContext() {
    return { ...context, applyInvocations: context.applyInvocations };
  }

  function transition(event, payload = {}) {
    switch (state) {
      case STATES.WELCOME:
        if (event === 'start') {
          state = STATES.SCAN_RESULTS;
          return { ok: true };
        }
        break;
      case STATES.SCAN_RESULTS:
        if (event === 'plan') {
          state = STATES.CANDIDATE_PLAN;
          return { ok: true };
        }
        if (event === 'select-evidence') {
          context.selectedEvidenceId = payload.id || null;
          state = STATES.EVIDENCE_DETAIL;
          return { ok: true };
        }
        if (event === 'rescan') {
          return { ok: true, rescan: true };
        }
        break;
      case STATES.CANDIDATE_PLAN:
        if (event === 'select-candidate') {
          context.selectedCandidateId = payload.id || null;
          return { ok: true };
        }
        if (event === 'preview-diff') {
          if (!context.pipeline) return fail('Pipeline missing');
          if (!context.pipeline.audit.ok) {
            state = STATES.AUDIT_DETAIL;
            return { ok: true, blocked: 'audit' };
          }
          if (!context.generated || !context.generated.ok) {
            state = STATES.ERROR;
            context.error = context.generated ? context.generated.message : 'Dry-run unavailable';
            return { ok: false, blocked: 'generation' };
          }
          state = STATES.DRY_RUN_DIFF;
          return { ok: true };
        }
        if (event === 'run-evolve') {
          const result = evolveWorkflow(context.pipeline.root, context.pipeline);
          context.evolveInvocations += 1;
          context.lastEvolveOutput = result.stdout || result.stderr || '';
          state = result.exitCode === 0 ? STATES.EVOLVE_PROPOSAL : STATES.AUDIT_DETAIL;
          return { ok: result.exitCode === 0 };
        }
        break;
      case STATES.EVIDENCE_DETAIL:
      case STATES.AUDIT_DETAIL:
        if (event === 'plan') {
          state = STATES.CANDIDATE_PLAN;
          return { ok: true };
        }
        if (event === 'preview-diff') {
          return transition('preview-diff', payload);
        }
        break;
      case STATES.DRY_RUN_DIFF:
        if (event === 'confirm-apply') {
          if (payload.text !== APPLY_CONFIRM_TEXT) {
            state = STATES.ERROR;
            context.error = 'Apply confirmation text did not match';
            return { ok: false };
          }
          if (!context.pipeline || !context.pipeline.audit.ok || !context.generated || !context.generated.ok) {
            return { ok: false, blocked: 'apply' };
          }
          state = STATES.APPLY_CONFIRM;
          return { ok: true };
        }
        if (event === 'cancel-apply') {
          state = STATES.DRY_RUN_DIFF;
          return { ok: true, cancelled: true };
        }
        break;
      case STATES.APPLY_CONFIRM:
        if (event === 'apply') {
          const result = applyWorkflow(context.pipeline.root, context.generated);
          context.applyInvocations += 1;
          context.lastApplyResult = result;
          context.rollbackId = result.rollbackId || null;
          state = result.ok ? STATES.APPLY_RESULT : STATES.ERROR;
          if (!result.ok) context.error = result.message || result.stderr;
          return { ok: result.ok };
        }
        break;
      case STATES.APPLY_RESULT:
        if (event === 'run-rollback' && payload.id) {
          const result = rollbackWorkflow(context.pipeline.root, payload.id);
          context.rollbackInvocations += 1;
          context.lastRollbackResult = result;
          state = result.ok ? STATES.ROLLBACK_RESULT : STATES.ERROR;
          if (!result.ok) context.error = result.message || result.stderr;
          return { ok: result.ok };
        }
        break;
      case STATES.ROLLBACK_SELECT:
        if (event === 'run-rollback' && payload.id) {
          const result = rollbackWorkflow(context.pipeline.root, payload.id);
          context.rollbackInvocations += 1;
          context.lastRollbackResult = result;
          state = result.ok ? STATES.ROLLBACK_RESULT : STATES.ERROR;
          if (!result.ok) context.error = result.message || result.stderr;
          return { ok: result.ok };
        }
        break;
      case STATES.EVOLVE_PROPOSAL:
        if (event === 'plan') {
          state = STATES.CANDIDATE_PLAN;
          return { ok: true };
        }
        if (event === 'preview-diff') {
          state = STATES.CANDIDATE_PLAN;
          return transition('preview-diff', payload);
        }
        break;
      default:
        break;
    }
    if (event === 'quit') return { ok: true, quit: true };
    return fail(`Invalid transition: ${state} + ${event}`);
  }

  function setPipeline(pipeline) {
    context.pipeline = pipeline;
  }

  function setGenerated(generated) {
    context.generated = generated;
  }

  function showProposalReview(output, proposalId = null) {
    context.lastEvolveOutput = output;
    context.activeProposalId = proposalId;
    state = STATES.EVOLVE_PROPOSAL;
    return { ok: true };
  }

  function fail(message) {
    return { ok: false, error: message };
  }

  return {
    APPLY_CONFIRM_TEXT,
    STATES,
    getContext,
    getState,
    setGenerated,
    setPipeline,
    showProposalReview,
    transition,
  };
}

module.exports = { APPLY_CONFIRM_TEXT, STATES, createTuiStateMachine };
