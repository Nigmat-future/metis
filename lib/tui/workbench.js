const RAIL_STEPS = ['scan', 'plan', 'diff', 'apply', 'rollback', 'evolve'];

const RAIL_COMMANDS = {
  scan: 'rescan',
  plan: 'plan',
  diff: 'preview-diff',
  apply: 'apply',
  evolve: 'run-evolve',
};

function clampFocus(focusIndex, length) {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(focusIndex, length - 1));
}

function activeRailIndex(state) {
  if (state === 'candidate-plan') return RAIL_STEPS.indexOf('plan');
  if (state === 'dry-run-diff' || state === 'apply-confirm') return RAIL_STEPS.indexOf('diff');
  if (state === 'apply-result') return RAIL_STEPS.indexOf('apply');
  if (state === 'rollback-result' || state === 'rollback-select') return RAIL_STEPS.indexOf('rollback');
  if (state === 'evolve-proposal') return RAIL_STEPS.indexOf('evolve');
  return RAIL_STEPS.indexOf('scan');
}

function getListRows(state, viewModel, shell = {}) {
  if (state === 'scan-results' && shell.showWelcome) return [];
  if (state === 'candidate-plan') {
    return viewModel.candidates.slice(0, 10).map((row) => ({ id: row.id, kind: 'candidate' }));
  }
  if (state === 'scan-results' || state === 'evidence-detail') {
    return viewModel.evidence.slice(0, 9).map((row) => ({ id: row.id, kind: 'evidence' }));
  }
  return [];
}

function railStepCommand(step) {
  if (step === 'rollback') return null;
  return RAIL_COMMANDS[step] || null;
}

function listSelectCommand(row) {
  if (!row) return null;
  if (row.kind === 'candidate') return { event: 'select-candidate', payload: { id: row.id } };
  return { event: 'select-evidence', payload: { id: row.id } };
}

function syncWorkbenchFocus(shell, state, viewModel) {
  if (shell.railFocusIndex == null) shell.railFocusIndex = activeRailIndex(state);
  shell.railFocusIndex = clampFocus(shell.railFocusIndex, RAIL_STEPS.length);
  const rows = getListRows(state, viewModel, shell);
  if (rows.length === 0) {
    shell.listFocusIndex = 0;
    if (shell.focusZone === 'list') shell.focusZone = 'rail';
    return rows;
  }
  shell.listFocusIndex = clampFocus(shell.listFocusIndex || 0, rows.length);
  return rows;
}

function isWorkbenchNavActive(state, shell, viewModel, menuActive) {
  if (shell.busy || shell.pendingApply || menuActive) return false;
  if (shell.input && shell.focusZone === 'command') return false;
  if (state === 'scan-results' && shell.showWelcome) return false;
  const rows = getListRows(state, viewModel, shell);
  if (rows.length > 0) return true;
  return [
    'dry-run-diff',
    'apply-confirm',
    'candidate-plan',
    'apply-result',
    'evolve-proposal',
    'audit-detail',
    'error',
    'evidence-detail',
  ].includes(state);
}

module.exports = {
  RAIL_STEPS,
  activeRailIndex,
  clampFocus,
  getListRows,
  isWorkbenchNavActive,
  listSelectCommand,
  railStepCommand,
  syncWorkbenchFocus,
};
