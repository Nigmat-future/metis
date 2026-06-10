const { createCommandHistory } = require('./history');
const { completeCommand } = require('./completion');
const { parseCommandLine } = require('./commands');
const { renderFrame, renderScreenUpdate } = require('./renderer');
const { parseKeyChunk } = require('./terminal-keys');
const { applyParsedCommand } = require('./script-runner');
const { contextFor, createShellState, currentView, isApplyConfirmActive, isMenuActive, refreshPipeline, supportsColor } = require('./session');
const { clampFocus, getWelcomeMenuItems } = require('./menu');
const {
  RAIL_STEPS,
  isWorkbenchNavActive,
  listSelectCommand,
  railStepCommand,
  syncWorkbenchFocus,
} = require('./workbench');

function runInteractiveLoop(root, flags, machine, columns) {
  return new Promise((resolve) => {
    refreshPipeline(machine, root, flags);
    machine.transition('start');

    const history = createCommandHistory();
    const shell = createShellState();
    const input = process.stdin;
    const output = process.stdout;
    const color = supportsColor();

    function paint() {
      const viewModel = currentView(machine, shell);
      const menuActive = isMenuActive(machine, shell);
      const state = machine.getState();
      if (menuActive) {
        const items = getWelcomeMenuItems(viewModel);
        shell.menuFocusIndex = clampFocus(shell.menuFocusIndex, items);
      } else {
        syncWorkbenchFocus(shell, state, viewModel);
      }
      const workbenchNavActive = isWorkbenchNavActive(state, shell, viewModel, menuActive);
      const frame = renderFrame(viewModel, state, contextFor(machine, shell), columns, {
        color,
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
      output.write(renderScreenUpdate(frame, shell.firstPaint));
      shell.firstPaint = false;
    }

    function executeMenuItem(index) {
      const viewModel = currentView(machine, shell);
      const items = getWelcomeMenuItems(viewModel);
      const item = items[clampFocus(index, items)];
      if (!item) return false;
      return execute(item.command);
    }

    function handleMenuKey(key) {
      const viewModel = currentView(machine, shell);
      const items = getWelcomeMenuItems(viewModel);
      if (key.type === 'up') {
        shell.menuFocusIndex = clampFocus(shell.menuFocusIndex - 1, items);
        return 'handled';
      }
      if (key.type === 'down') {
        shell.menuFocusIndex = clampFocus(shell.menuFocusIndex + 1, items);
        return 'handled';
      }
      if (key.type === 'enter') {
        return executeMenuItem(shell.menuFocusIndex) ? 'quit' : 'handled';
      }
      if (key.type === 'text' && /^[1-9]$/.test(key.value)) {
        const index = Number(key.value) - 1;
        if (index < items.length) {
          shell.menuFocusIndex = index;
          return executeMenuItem(index) ? 'quit' : 'handled';
        }
        shell.inputMode = 'command';
        shell.input += key.value;
        return 'handled';
      }
      if (key.type === 'text') {
        shell.inputMode = 'command';
        shell.input += key.value;
        return 'handled';
      }
      return false;
    }

    function close(exitCode) {
      input.off('data', onData);
      if (input.isTTY && input.setRawMode) input.setRawMode(false);
      input.pause();
      output.write('\x1b[?25h');
      resolve({ exitCode, stdout: '', stderr: '' });
    }

    function execute(line) {
      const parsed = parseCommandLine(line);
      history.push(line);
      shell.input = '';
      shell.focusZone = 'list';
      if (!parsed) {
        shell.message = 'empty command';
        paint();
        return;
      }
      const result = applyParsedCommand(machine, root, flags, shell, parsed, () => {
        shell.frame += 1;
        paint();
      });
      if (result.quit) {
        close(0);
        return true;
      }
      paint();
      return false;
    }

    function runParsed(parsed) {
      const result = applyParsedCommand(machine, root, flags, shell, parsed, () => {
        shell.frame += 1;
        paint();
      });
      if (result && result.quit) return 'quit';
      if (parsed.event === 'plan' || parsed.event === 'rescan') shell.focusZone = 'list';
      return 'handled';
    }

    function handleWorkbenchKey(key) {
      const viewModel = currentView(machine, shell);
      const state = machine.getState();
      const rows = syncWorkbenchFocus(shell, state, viewModel);
      if (key.type === 'tab' && !shell.input) {
        shell.focusZone = shell.focusZone === 'rail' && rows.length ? 'list' : 'rail';
        return 'handled';
      }
      if (shell.focusZone === 'rail') {
        if (key.type === 'up') {
          shell.railFocusIndex = clampFocus(shell.railFocusIndex - 1, RAIL_STEPS.length);
          return 'handled';
        }
        if (key.type === 'down') {
          shell.railFocusIndex = clampFocus(shell.railFocusIndex + 1, RAIL_STEPS.length);
          return 'handled';
        }
        if (key.type === 'enter') {
          const step = RAIL_STEPS[shell.railFocusIndex];
          const cmd = railStepCommand(step);
          if (!cmd) {
            shell.message = 'rollback requires run-rollback <id>';
            return 'handled';
          }
          return runParsed(parseCommandLine(cmd));
        }
      }
      if (shell.focusZone === 'list' && rows.length) {
        if (key.type === 'up') {
          shell.listFocusIndex = clampFocus(shell.listFocusIndex - 1, rows.length);
          return 'handled';
        }
        if (key.type === 'down') {
          shell.listFocusIndex = clampFocus(shell.listFocusIndex + 1, rows.length);
          return 'handled';
        }
        if (key.type === 'enter') {
          const parsed = listSelectCommand(rows[shell.listFocusIndex]);
          if (!parsed) return 'handled';
          return runParsed(parsed);
        }
      }
      if (key.type === 'text') {
        shell.focusZone = 'command';
        shell.input += key.value;
        return 'handled';
      }
      return false;
    }

    function handleApplyConfirmKey(key) {
      if (key.type === 'text' && key.value === '1') {
        return runParsed(parseCommandLine('cancel-apply'));
      }
      if (key.type === 'text') {
        shell.input += key.value;
        return 'handled';
      }
      return false;
    }

    function onData(chunk) {
      let closed = false;
      const menuActive = isMenuActive(machine, shell);
      const viewModel = currentView(machine, shell);
      const workbenchNavActive = isWorkbenchNavActive(machine.getState(), shell, viewModel, menuActive);
      const applyConfirmActive = isApplyConfirmActive(shell);
      for (const key of parseKeyChunk(chunk)) {
        if (key.type === 'ctrl-c') {
          close(0);
          closed = true;
          break;
        }
        if (menuActive) {
          const menuResult = handleMenuKey(key);
          if (menuResult === 'quit') {
            closed = true;
            break;
          }
          if (menuResult === 'handled') continue;
        }
        if (applyConfirmActive) {
          const applyResult = handleApplyConfirmKey(key);
          if (applyResult === 'quit') {
            closed = true;
            break;
          }
          if (applyResult === 'handled') continue;
        }
        if (workbenchNavActive && !shell.input && shell.focusZone !== 'command') {
          const wbResult = handleWorkbenchKey(key);
          if (wbResult === 'quit') {
            closed = true;
            break;
          }
          if (wbResult === 'handled') continue;
        }
        if (key.type === 'up') shell.input = history.previous();
        if (key.type === 'down') shell.input = history.next();
        if (key.type === 'tab') {
          const completed = completeCommand(shell.input, machine.getState(), contextFor(machine, shell));
          if (completed) shell.input = completed;
        }
        if (key.type === 'enter' && execute(shell.input)) {
          closed = true;
          break;
        }
        if (key.type === 'backspace') shell.input = shell.input.slice(0, -1);
        if (key.type === 'text') shell.input += key.value;
      }
      if (!closed) paint();
    }

    output.write('\x1b[?25l');
    if (input.isTTY && input.setRawMode) input.setRawMode(true);
    input.setEncoding('utf8');
    input.resume();
    input.on('data', onData);
    paint();
  });
}

module.exports = { runInteractiveLoop };
