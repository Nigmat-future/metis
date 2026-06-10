const fs = require('node:fs');
const { APPLY_CONFIRM_TEXT } = require('./state');
const { parseCommandLine } = require('./commands');
const { completeCommand } = require('./completion');
const { renderFrame } = require('./renderer');
const { handleProposalCommand, isProposalCommand, markAppliedProposal } = require('./proposal-handlers');
const { contextFor, createShellState, currentView, isMenuActive, refreshPipeline } = require('./session');
const { clampFocus, getWelcomeMenuItems } = require('./menu');
const {
  RAIL_STEPS,
  isWorkbenchNavActive,
  listSelectCommand,
  railStepCommand,
  syncWorkbenchFocus,
} = require('./workbench');

function runScriptedTui(root, flags, machine, events, columns) {
  const transcript = [];
  const shell = createShellState();
  refreshPipeline(machine, root, flags);
  machine.transition('start');
  transcript.push(scriptFrame(machine, shell, columns));
  let hardFailure = false;

  for (const line of events) {
    const parsed = parseCommandLine(line);
    if (!parsed) continue;
    const result = applyParsedCommand(machine, root, flags, shell, parsed);
    if (result && !result.ok && !result.recoverable) hardFailure = true;
    transcript.push(scriptFrame(machine, shell, columns));
    if (parsed.event === 'quit' || (result && result.quit)) break;
  }

  const output = transcript.join('');
  const auditFailed = machine.getContext().pipeline && !machine.getContext().pipeline.audit.ok;
  const exitCode = auditFailed || hardFailure ? 1 : 0;
  return { exitCode, stdout: output, stderr: '' };
}

function applyParsedCommand(machine, root, flags, shell, parsed, beforeSync = null) {
  if (parsed.event === 'tab-complete') {
    const completed = completeCommand(parsed.partial || '', machine.getState(), contextFor(machine, shell));
    shell.input = completed || parsed.partial || '';
    shell.message = completed ? `completed: ${completed}` : 'no unique completion';
    return { ok: Boolean(completed), recoverable: !completed };
  }
  if (parsed.event === 'dismiss-welcome') {
    shell.showWelcome = false;
    shell.message = 'welcome dismissed';
    return { ok: true };
  }
  if (parsed.event === 'select-menu') {
    const viewModel = currentView(machine, shell);
    const items = getWelcomeMenuItems(viewModel);
    const item = items[clampFocus(parsed.index, items)];
    if (!item) {
      shell.message = 'invalid menu selection';
      return { ok: false, recoverable: true };
    }
    return applyParsedCommand(machine, root, flags, shell, parseCommandLine(item.command), beforeSync);
  }
  if (parsed.event === 'focus-zone') {
    shell.focusZone = parsed.zone;
    shell.message = `focus ${parsed.zone}`;
    return { ok: true };
  }
  if (parsed.event === 'select-rail') {
    const stepIndex = RAIL_STEPS.indexOf(parsed.step);
    if (stepIndex < 0) {
      shell.message = 'invalid rail step';
      return { ok: false, recoverable: true };
    }
    shell.railFocusIndex = stepIndex;
    shell.focusZone = 'rail';
    const cmd = railStepCommand(parsed.step);
    if (!cmd) {
      shell.message = 'rollback requires run-rollback <id>';
      return { ok: false, recoverable: true };
    }
    return applyParsedCommand(machine, root, flags, shell, parseCommandLine(cmd), beforeSync);
  }
  if (parsed.event === 'select-list') {
    const viewModel = currentView(machine, shell);
    const rows = syncWorkbenchFocus(shell, machine.getState(), viewModel);
    shell.listFocusIndex = clampFocus(parsed.index, rows.length);
    shell.focusZone = 'list';
    const selected = listSelectCommand(rows[shell.listFocusIndex]);
    if (!selected) {
      shell.message = 'invalid list selection';
      return { ok: false, recoverable: true };
    }
    return applyParsedCommand(machine, root, flags, shell, selected, beforeSync);
  }
  if (isProposalCommand(parsed.event)) return handleProposalCommand(machine, root, shell, parsed);
  if (shell.pendingApply) return handlePendingApply(machine, root, shell, parsed, beforeSync);
  if (parsed.event === 'rescan') {
    shell.showWelcome = false;
    shell.pendingProposalApplyId = null;
    shell.busy = true;
    shell.message = 'rescanning evidence';
    if (beforeSync) beforeSync();
    refreshPipeline(machine, root, flags);
    shell.busy = false;
    shell.message = 'rescanned';
    return { ok: true };
  }
  if (parsed.event === 'preview-diff' || parsed.event === 'run-evolve' || parsed.event === 'apply-command') {
    ensurePlan(machine);
  }
  if (parsed.event === 'apply-command') {
    const result = requestApply(machine, shell);
    if (result.ok) shell.applyConfirmFocus = 0;
    return result;
  }
  if (parsed.event === 'confirm-apply') return confirmAndApply(machine, root, shell, parsed.text, beforeSync);
  if (parsed.event === 'cancel-apply') {
    shell.pendingApply = false;
    shell.message = 'Cancelled';
    return machine.transition('cancel-apply');
  }
  const result = machine.transition(parsed.event, parsed.payload || {});
  if (result.ok) shell.showWelcome = false;
  shell.message = result.ok ? 'ready' : result.error || 'invalid command';
  return { ...result, recoverable: !result.ok && parsed.event !== 'run-rollback' };
}

function handlePendingApply(machine, root, shell, parsed, beforeSync) {
  if (parsed.event === 'cancel-apply') {
    shell.pendingApply = false;
    shell.message = 'Cancelled';
    return machine.transition('cancel-apply');
  }
  if (parsed.event === 'quit') return { ok: true, quit: true };
  if (parsed.event !== 'confirm-apply') {
    shell.message = `type ${APPLY_CONFIRM_TEXT} to continue`;
    return { ok: false, recoverable: true };
  }
  return confirmAndApply(machine, root, shell, parsed.text, beforeSync);
}

function requestApply(machine, shell) {
  if (machine.getState() !== 'dry-run-diff') {
    const preview = machine.transition('preview-diff');
    if (!preview.ok || machine.getState() !== 'dry-run-diff') {
      shell.message = preview.error || 'apply blocked before diff preview';
      return preview;
    }
  }
  shell.pendingApply = true;
  shell.message = `type ${APPLY_CONFIRM_TEXT} to continue`;
  return { ok: true };
}

function confirmAndApply(machine, root, shell, text, beforeSync) {
  const confirmed = machine.transition('confirm-apply', { text });
  if (!confirmed.ok) {
    shell.pendingApply = false;
    shell.message = `Confirmation failed. Type exactly: ${APPLY_CONFIRM_TEXT}`;
    return confirmed;
  }
  shell.pendingApply = false;
  shell.busy = true;
  shell.message = 'applying changes';
  if (beforeSync) beforeSync();
  const applied = machine.transition('apply');
  if (applied.ok) {
    const proposalStatus = markAppliedProposal(root, shell);
    if (!proposalStatus.ok) {
      shell.busy = false;
      shell.message = `Apply succeeded; proposal status update failed: ${proposalStatus.message}`;
      return proposalStatus;
    }
  }
  shell.busy = false;
  shell.message = applied.ok ? `Applied. Rollback ID: ${machine.getContext().rollbackId || 'none'}` : `Apply failed: ${machine.getContext().error || 'unknown'}`;
  return applied;
}

function ensurePlan(machine) {
  if (machine.getState() === 'scan-results') machine.transition('plan');
}

function scriptFrame(machine, shell, columns) {
  const viewModel = currentView(machine, shell);
  const menuActive = isMenuActive(machine, shell);
  const state = machine.getState();
  syncWorkbenchFocus(shell, state, viewModel);
  const workbenchNavActive = isWorkbenchNavActive(state, shell, viewModel, menuActive);
  return renderFrame(viewModel, state, contextFor(machine, shell), columns, {
    commandInput: shell.input,
    message: shell.message,
    pendingApply: shell.pendingApply,
    frame: shell.frame,
    busy: shell.busy,
    menuFocusIndex: shell.menuFocusIndex,
    menuActive,
    workbenchNavActive,
    focusZone: shell.focusZone,
    railFocusIndex: shell.railFocusIndex,
    listFocusIndex: shell.listFocusIndex,
    pendingApply: shell.pendingApply,
    applyConfirmFocus: shell.applyConfirmFocus,
  });
}

function loadScript(scriptPath) {
  return fs.readFileSync(scriptPath, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

module.exports = { applyParsedCommand, loadScript, runScriptedTui };
