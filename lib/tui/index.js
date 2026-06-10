const {
  applyWorkflow,
  rollbackWorkflow,
  evolveWorkflow,
} = require('../workflows');
const { createTuiStateMachine, APPLY_CONFIRM_TEXT } = require('./state');
const { loadScript, runScriptedTui } = require('./script-runner');
const { runInteractiveLoop } = require('./shell');

function runTui(root, flags) {
  if (!flags.script && !process.stdout.isTTY) {
    return {
      exitCode: 2,
      stdout: '',
      stderr: 'Metis TUI requires an interactive terminal. Use --script <path> or CLI commands (scan, plan, init).\n',
    };
  }
  const machine = createTuiStateMachine({ applyWorkflow, rollbackWorkflow, evolveWorkflow });
  const events = flags.script ? loadScript(flags.script) : null;
  const columns = events ? Number(process.env.COLUMNS) || 100 : process.stdout.columns || Number(process.env.COLUMNS) || 100;
  if (events) return runScriptedTui(root, flags, machine, events, columns);
  return { interactive: true, root, flags, machine, columns };
}

function runInteractiveTui(root, flags) {
  const session = runTui(root, flags);
  if (!session.interactive) return Promise.resolve(session);
  return runInteractiveLoop(session.root, session.flags, session.machine, session.columns);
}

module.exports = { APPLY_CONFIRM_TEXT, runInteractiveTui, runTui };
