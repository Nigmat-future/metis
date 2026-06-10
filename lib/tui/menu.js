function getWelcomeMenuItems(viewModel) {
  const auditOk = viewModel.summary.auditOk;
  const hasEvidence = viewModel.summary.evidenceCount > 0;

  if (!auditOk) {
    return [
      item('dismiss-welcome', 'View safety audit', 'dismiss-welcome'),
      item('rescan', 'Rescan evidence', 'rescan'),
      item('quit', 'Quit', 'quit'),
    ];
  }

  if (!hasEvidence) {
    return [
      item('rescan', 'Rescan evidence', 'rescan'),
      item('quit', 'Quit', 'quit'),
    ];
  }

  return [
    item('plan', 'Review plan', 'plan'),
    item('rescan', 'Rescan evidence', 'rescan'),
    item('quit', 'Quit', 'quit'),
  ];
}

function item(id, label, command) {
  return { id, label, command };
}

function clampFocus(focusIndex, items) {
  if (!items.length) return 0;
  return Math.max(0, Math.min(focusIndex, items.length - 1));
}

module.exports = {
  clampFocus,
  getWelcomeMenuItems,
};
