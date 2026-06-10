const { APPLY_CONFIRM_TEXT } = require('./state');

function getCommandSuggestions(state, context = {}) {
  if (context.pendingApply) return [command(APPLY_CONFIRM_TEXT, 'confirm write'), command('cancel-apply', 'abort')];
  if (state === 'scan-results') return names(['plan', 'rescan', 'run-evolve', 'quit']);
  if (state === 'candidate-plan') {
    const base = ['preview-diff', 'save-proposal', 'proposal-list', 'run-evolve', 'rescan', 'quit'];
    if (canApply(context)) base.splice(1, 0, 'apply');
    return names(base);
  }
  if (state === 'dry-run-diff' || state === 'apply-confirm') {
    const base = canApply(context) ? ['apply', 'cancel-apply', 'run-evolve', 'quit'] : ['cancel-apply', 'run-evolve', 'quit'];
    return names(base);
  }
  if (state === 'apply-result') return names(['run-rollback', 'rescan', 'quit']);
  if (state === 'rollback-result') return names(['rescan', 'quit']);
  if (state === 'audit-detail' || state === 'error') return names(['plan', 'rescan', 'quit']);
  if (state === 'evolve-proposal') return names(['proposal-list', 'save-proposal', 'plan', 'preview-diff', 'quit']);
  return names(['plan', 'rescan', 'quit']);
}

function parseCommandLine(line) {
  const trimmed = String(line || '').trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  if (trimmed === APPLY_CONFIRM_TEXT) return { event: 'confirm-apply', text: APPLY_CONFIRM_TEXT };
  if (trimmed === 'start') return { event: 'start' };
  if (trimmed === 'scan' || trimmed === 'rescan') return { event: 'rescan' };
  if (trimmed === 'plan') return { event: 'plan' };
  if (trimmed === 'preview-diff') return { event: 'preview-diff' };
  if (trimmed === 'apply') return { event: 'apply-command' };
  if (trimmed === 'cancel-apply') return { event: 'cancel-apply' };
  if (trimmed === 'quit') return { event: 'quit' };
  if (trimmed === 'run-evolve') return { event: 'run-evolve' };
  if (trimmed.startsWith('confirm-apply ')) return { event: 'confirm-apply', text: trimmed.slice('confirm-apply '.length) };
  if (trimmed.startsWith('select-evidence ')) return { event: 'select-evidence', payload: { id: trimmed.slice('select-evidence '.length) } };
  if (trimmed.startsWith('select-candidate ')) return { event: 'select-candidate', payload: { id: trimmed.slice('select-candidate '.length) } };
  if (trimmed.startsWith('run-rollback ')) return { event: 'run-rollback', payload: { id: trimmed.slice('run-rollback '.length) } };
  if (trimmed.startsWith('tab-complete ')) return { event: 'tab-complete', partial: trimmed.slice('tab-complete '.length) };
  if (trimmed === 'dismiss-welcome') return { event: 'dismiss-welcome' };
  if (trimmed.startsWith('select-menu ')) {
    return { event: 'select-menu', index: Number(trimmed.slice('select-menu '.length)) - 1 };
  }
  if (trimmed.startsWith('select-rail ')) return { event: 'select-rail', step: trimmed.slice('select-rail '.length) };
  if (trimmed.startsWith('select-list ')) return { event: 'select-list', index: Number(trimmed.slice('select-list '.length)) };
  if (trimmed === 'focus-zone rail') return { event: 'focus-zone', zone: 'rail' };
  if (trimmed === 'focus-zone list') return { event: 'focus-zone', zone: 'list' };
  if (trimmed === 'save-proposal --yes') return { event: 'save-proposal', confirmed: true };
  if (trimmed === 'save-proposal') return { event: 'save-proposal', confirmed: false };
  if (trimmed === 'proposal-list') return { event: 'proposal-list' };
  if (trimmed.startsWith('proposal-inspect ')) return { event: 'proposal-inspect', id: trimmed.slice('proposal-inspect '.length) };
  if (trimmed.startsWith('proposal-dismiss ')) {
    const rest = trimmed.slice('proposal-dismiss '.length);
    if (rest.endsWith(' --yes')) {
      return { event: 'proposal-dismiss', id: rest.slice(0, -' --yes'.length).trim(), confirmed: true };
    }
    return { event: 'proposal-dismiss', id: rest.trim(), confirmed: false };
  }
  if (trimmed.startsWith('proposal-accept-dry-run ')) return { event: 'proposal-accept-dry-run', id: trimmed.slice('proposal-accept-dry-run '.length) };
  if (trimmed.startsWith('proposal-accept-apply ')) return { event: 'proposal-accept-apply', id: trimmed.slice('proposal-accept-apply '.length) };
  return { event: trimmed };
}

function canApply(context) {
  const pipeline = context.pipeline;
  const generated = context.generated;
  return Boolean(pipeline && pipeline.audit && pipeline.audit.ok && generated && generated.ok);
}

function names(values) {
  return values.map((name) => command(name, labelFor(name)));
}

function command(name, label) {
  return { name, label };
}

function labelFor(name) {
  const labels = {
    plan: 'view candidates',
    rescan: 'refresh evidence',
    'preview-diff': 'show dry-run diff',
    apply: 'confirm write',
    'cancel-apply': 'return to diff',
    'run-evolve': 'review evolution proposal',
    'run-rollback': 'restore by id',
    'save-proposal': 'save evolve proposal',
    'proposal-list': 'list saved proposals',
    quit: 'exit',
  };
  return labels[name] || name;
}

module.exports = {
  getCommandSuggestions,
  parseCommandLine,
};
