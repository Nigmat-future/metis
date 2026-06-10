const { scanWorkflow, initDryRunWorkflow } = require('../workflows');
const { buildTuiViewModel, buildWelcomeHints } = require('../ui/view-model');
const { APPLY_CONFIRM_TEXT } = require('./state');

function refreshPipeline(machine, root, flags) {
  const pipeline = scanWorkflow(root, { includeHistory: flags.includeHistory });
  const generated = initDryRunWorkflow(pipeline);
  machine.setPipeline(pipeline);
  machine.setGenerated(generated);
}

function currentView(machine, shell = {}) {
  const ctx = machine.getContext();
  const model = buildTuiViewModel(ctx.pipeline, ctx.generated);
  if (shell.showWelcome) model.welcome = buildWelcomeHints(model.summary);
  return model;
}

function contextFor(machine, shell) {
  return { ...machine.getContext(), pendingApply: shell.pendingApply, pendingApplyText: APPLY_CONFIRM_TEXT };
}

function createShellState() {
  return {
    input: '',
    message: 'ready',
    pendingApply: false,
    frame: 0,
    firstPaint: true,
    busy: false,
    showWelcome: true,
    inputMode: 'menu',
    menuFocusIndex: 0,
    focusZone: 'list',
    railFocusIndex: null,
    listFocusIndex: 0,
    applyConfirmFocus: 0,
    pendingProposalApplyId: null,
  };
}

function isApplyConfirmActive(shell) {
  return Boolean(shell.pendingApply && !shell.input);
}

function isMenuActive(machine, shell) {
  return Boolean(
    shell.showWelcome
    && machine.getState() === 'scan-results'
    && shell.inputMode === 'menu'
    && !shell.input
    && !shell.pendingApply
    && !shell.busy,
  );
}

function supportsColor() {
  return process.env.NO_COLOR !== '1' && process.env.TERM !== 'dumb';
}

module.exports = {
  contextFor,
  createShellState,
  currentView,
  isApplyConfirmActive,
  isMenuActive,
  refreshPipeline,
  supportsColor,
};
