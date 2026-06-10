const { getCommandSuggestions } = require('./commands');
const { inlineSuggestion } = require('./completion');
const { renderLogo } = require('./logo');
const { getWelcomeMenuItems } = require('./menu');
const { APPLY_CONFIRM_TEXT } = require('./state');
const { paint, screenUpdate, spinner } = require('./theme');
const { clip, fit, pad, row, splitLines } = require('./renderer-format');

function renderFrame(viewModel, state, context, columns, options = {}) {
  const width = Math.max(68, (Number(columns) || 100) - 2);
  const color = Boolean(options.color);
  const frame = Number(options.frame) || 0;
  const busy = options.busy ? `sync ${spinner(frame)}` : 'ready';
  const merged = { ...context, pendingApply: options.pendingApply };
  const lines = [];
  lines.push(topLine(width, color));
  lines.push(statusLine(viewModel, state, merged, width, busy, color));
  lines.push(divider(width, color));
  lines.push(...workbench(viewModel, state, merged, width, color, options));
  lines.push(divider(width, color));
  lines.push(commandBar(state, merged, width, options, color));
  lines.push(messageLine(state, merged, width, options, color));
  lines.push(bottomLine(width, color));
  return `${lines.join('\n')}\n`;
}

function renderScreenUpdate(frame, firstPaint) {
  return screenUpdate(frame, firstPaint);
}

function topLine(width, color) {
  const title = paint(' METIS WORKBENCH ', 'accent', color);
  const plainTitle = ' METIS WORKBENCH ';
  const side = Math.max(0, width - plainTitle.length);
  return `${paint('╭', 'border', color)}${paint('─'.repeat(Math.floor(side / 2)), 'border', color)}${title}${paint('─'.repeat(side - Math.floor(side / 2)), 'border', color)}${paint('╮', 'border', color)}`;
}

function bottomLine(width, color) {
  return `${paint('╰', 'border', color)}${paint('─'.repeat(width), 'border', color)}${paint('╯', 'border', color)}`;
}

function divider(width, color) {
  return `${paint('├', 'border', color)}${paint('─'.repeat(width), 'border', color)}${paint('┤', 'border', color)}`;
}

function statusLine(viewModel, state, context, width, busy, color) {
  const root = context.pipeline && context.pipeline.root ? context.pipeline.root : '.';
  const audit = viewModel.summary.auditOk ? paint('audit ok', 'bronze', color) : paint('audit failed', 'danger', color);
  const text = [
    paint('METIS', 'accent', color),
    `root ${clip(root, Math.max(12, Math.floor(width / 4)))}`,
    `state ${state}`,
    audit,
    'writes none',
    busy,
  ].join('  ');
  return row(text, width, color);
}

function workbench(viewModel, state, context, width, color, options = {}) {
  const wide = width >= 120;
  const railWidth = wide ? 17 : 15;
  const sideWidth = wide ? 34 : 0;
  const mainWidth = wide ? width - railWidth - sideWidth - 4 : width - railWidth - 3;
  const rail = railPanel(state, railWidth, color, options);
  const main = mainPanel(viewModel, state, context, mainWidth, color, options);
  if (!wide) return compose([rail, main], [railWidth, mainWidth], color);
  const side = detailPanel(viewModel, context, sideWidth, color);
  return compose([rail, main, side], [railWidth, mainWidth, sideWidth], color);
}

function railPanel(state, width, color, options = {}) {
  const active = activeStep(state);
  const steps = ['scan', 'plan', 'diff', 'apply', 'rollback', 'evolve'];
  const activeIndex = steps.indexOf(active);
  const focusIndex = Number.isInteger(options.railFocusIndex) ? options.railFocusIndex : activeIndex;
  const zoneRail = options.focusZone === 'rail';
  const lines = [paint('WORKFLOW', 'accent', color), ''];
  for (const step of steps) {
    const index = steps.indexOf(step);
    const focused = zoneRail && index === focusIndex;
    const marker = index < activeIndex ? '[x]' : index === activeIndex ? '[>]' : '[ ]';
    const prefix = focused ? paint('▶', 'accent', color) : ' ';
    const role = focused ? 'accent' : index === activeIndex ? 'accent' : index < activeIndex ? 'bronze' : 'dim';
    lines.push(paint(fit(`${prefix}${marker} ${step}`, width), role, color));
  }
  return lines;
}

function mainPanel(viewModel, state, context, width, color, options = {}) {
  if (state === 'scan-results' && viewModel.welcome) return welcomePanel(viewModel, width, color, options);
  if (state === 'candidate-plan') return candidatesPanel(viewModel, width, color, options);
  if (state === 'dry-run-diff' || state === 'apply-confirm') return diffPanel(viewModel, width, color, options);
  if (state === 'apply-result') return resultPanel('Apply Result', [`Rollback ID: ${context.rollbackId || 'none'}`], width, color);
  if (state === 'rollback-result') return resultPanel('Rollback Result', ['Rollback complete.'], width, color);
  if (state === 'evolve-proposal') return resultPanel('Proposal Review', splitLines(context.lastEvolveOutput || '(no proposal)', 14), width, color);
  if (state === 'audit-detail' || state === 'error') return auditPanel(viewModel, context, width, color);
  return evidencePanel(viewModel, width, color, options);
}

function welcomePanel(viewModel, width, color, options = {}) {
  const welcome = viewModel.welcome;
  const lines = [];
  lines.push(...renderLogo(width, color));
  lines.push('');
  lines.push(statusSummary(viewModel, width, color));
  lines.push('');

  if (options.busy) {
    lines.push(fit(`Scanning evidence ${spinner(options.frame || 0)}`, width));
    lines.push('');
    return lines;
  }

  const items = getWelcomeMenuItems(viewModel);
  const focusIndex = Number(options.menuFocusIndex) || 0;
  lines.push(paint('Next step', 'accent', color));
  lines.push('');
  items.forEach((entry, index) => {
    const number = index + 1;
    const focused = index === focusIndex;
    const prefix = focused ? paint('▶', 'accent', color) : ' ';
    const label = `${prefix} [${number}] ${entry.label}`;
    lines.push(fit(focused ? paint(label, 'accent', color) : label, width));
  });
  lines.push('');
  lines.push(fit('↑↓ move · Enter select · 1-3 shortcut · or type a command below', width));
  lines.push(fit(welcome.doctorHint, width));
  return lines;
}

function statusSummary(viewModel, width, color) {
  const audit = viewModel.summary.auditOk
    ? paint('audit ok', 'bronze', color)
    : paint('audit failed', 'danger', color);
  const text = `Found ${viewModel.summary.evidenceCount} evidence · ${viewModel.summary.candidateCount} candidates · ${viewModel.summary.auditOk ? 'audit ok' : 'audit failed'}`;
  if (!color) return fit(text, width);
  const prefix = `Found ${viewModel.summary.evidenceCount} evidence · ${viewModel.summary.candidateCount} candidates · `;
  return fit(`${prefix}${audit}`, width);
}

function evidencePanel(viewModel, width, color, options = {}) {
  const lines = [paint('MAIN Evidence', 'accent', color), metricLine(viewModel, width), ''];
  lines.push(fit('ID         Source        Kind                 Status', width));
  viewModel.evidence.slice(0, 9).forEach((row, index) => {
    const focused = options.focusZone === 'list' && index === Number(options.listFocusIndex);
    const prefix = focused ? paint('▶', 'accent', color) : ' ';
    const text = `${prefix}${pad(row.id, 10)} ${pad(row.source, 13)} ${pad(row.kind, 20)} ${row.status}`;
    lines.push(fit(focused ? paint(text, 'accent', color) : text, width));
  });
  return lines;
}

function candidatesPanel(viewModel, width, color, options = {}) {
  const lines = [paint('MAIN Candidates', 'accent', color), metricLine(viewModel, width), ''];
  lines.push(fit('Decision      Risk  Candidate', width));
  viewModel.candidates.slice(0, 10).forEach((row, index) => {
    const focused = options.focusZone === 'list' && index === Number(options.listFocusIndex);
    const prefix = focused ? paint('▶', 'accent', color) : ' ';
    const text = `${prefix}${pad(row.decision, 13)} ${pad(row.risk, 5)} ${row.title}`;
    lines.push(fit(focused ? paint(text, 'accent', color) : text, width));
  });
  return lines;
}

function diffPanel(viewModel, width, color, options = {}) {
  const lines = [paint('MAIN Diff Preview', 'accent', color), ''];
  const maxLines = options.pendingApply ? 8 : 16;
  const diffLines = splitLines(viewModel.diff.preview || '(no diff)', maxLines);
  for (const line of diffLines) lines.push(fit(line, width));
  if (options.pendingApply) {
    lines.push('');
    lines.push(paint('Apply confirmation required', 'danger', color));
    lines.push(fit(`Type exactly in command bar: ${APPLY_CONFIRM_TEXT}`, width));
    lines.push('');
    const focused = Number(options.applyConfirmFocus) === 0;
    const label = `${focused ? '▶ ' : '  '}[1] Cancel apply — keep diff, no writes`;
    lines.push(fit(focused ? paint(label, 'accent', color) : label, width));
  }
  return lines;
}

function auditPanel(viewModel, context, width, color) {
  const lines = [paint('MAIN Safety Audit', viewModel.audit.ok ? 'accent' : 'danger', color), ''];
  if (context.error) lines.push(fit(`Error: ${context.error}`, width));
  if (viewModel.audit.ok) lines.push('No blocking issues.');
  for (const issue of viewModel.audit.issues.slice(0, 10)) {
    lines.push(fit(`[${issue.severity}] ${issue.message}`, width));
  }
  if (!viewModel.audit.ok) lines.push('Safety audit failed');
  return lines;
}

function resultPanel(title, rows, width, color) {
  const lines = [paint(`MAIN ${title}`, 'accent', color), ''];
  for (const line of rows) lines.push(fit(line, width));
  return lines;
}

function detailPanel(viewModel, context, width, color) {
  const selected = viewModel.evidence.find((row) => row.id === context.selectedEvidenceId) || viewModel.evidence[0];
  const lines = [paint('DETAIL / AUDIT', 'accent', color), ''];
  if (selected) {
    lines.push(fit(selected.id, width));
    lines.push(fit(selected.source, width));
    lines.push(fit(selected.summary, width));
    lines.push('');
  }
  lines.push(paint(viewModel.audit.ok ? 'No blocking issues.' : 'Safety audit failed', viewModel.audit.ok ? 'bronze' : 'danger', color));
  for (const issue of viewModel.audit.issues.slice(0, 4)) lines.push(fit(issue.message, width));
  return lines;
}

function commandBar(state, context, width, options, color) {
  const input = options.commandInput || '';
  const suffix = inlineSuggestion(input, state, context);
  const prompt = `${paint('metis ›', 'accent', color)} ${input}`;
  const suggest = suffix ? paint(`  suggest: ${suffix}`, 'dim', color) : '';
  return row(fit(`${prompt}${suggest}`, width), width, color);
}

function messageLine(state, context, width, options, color) {
  if (options.menuActive) {
    const hint = options.message && options.message !== 'ready'
      ? options.message
      : 'Menu mode — press a letter to type a command';
    return row(fit(hint, width), width, color);
  }
  if (options.pendingApply && !options.commandInput) {
    const hint = options.message && options.message !== 'ready' && !options.message.startsWith('type ')
      ? options.message
      : `[1] Cancel · type ${context.pendingApplyText || APPLY_CONFIRM_TEXT} in command bar to write`;
    return row(fit(hint, width), width, color);
  }
  if (options.workbenchNavActive && !options.commandInput) {
    if (options.message && options.message !== 'ready') {
      return row(fit(options.message, width), width, color);
    }
    const zone = options.focusZone === 'rail' ? 'rail' : 'list';
    const hint = zone === 'rail'
      ? 'Tab: list · ↑↓ rail · Enter run step · type command'
      : 'Tab: rail · ↑↓ list · Enter select row · type command';
    return row(fit(hint, width), width, color);
  }
  const suggestions = getCommandSuggestions(state, context).map((item) => `${item.name}:${item.label}`).slice(0, 4).join('  ');
  const message = context.pendingApply ? `type ${context.pendingApplyText || 'APPLY METIS'} to continue` : options.message || suggestions;
  return row(fit(message, width), width, color);
}

function compose(columns, widths, color) {
  const height = Math.max(...columns.map((column) => column.length));
  const lines = [];
  for (let index = 0; index < height; index += 1) {
    const cells = columns.map((column, columnIndex) => fit(column[index] || '', widths[columnIndex]));
    lines.push(row(cells.join(paint('│', 'border', color)), widths.reduce((sum, value) => sum + value, columns.length - 1), color));
  }
  return lines;
}

function activeStep(state) {
  if (state === 'candidate-plan') return 'plan';
  if (state === 'dry-run-diff' || state === 'apply-confirm') return 'diff';
  if (state === 'apply-result') return 'apply';
  if (state === 'rollback-result' || state === 'rollback-select') return 'rollback';
  if (state === 'evolve-proposal') return 'evolve';
  return 'scan';
}

function metricLine(viewModel, width) {
  return fit(`evidence ${viewModel.summary.evidenceCount}   candidates ${viewModel.summary.candidateCount}   audit ${viewModel.summary.auditOk ? 'ok' : 'failed'}`, width);
}

module.exports = { renderFrame, renderScreenUpdate };
