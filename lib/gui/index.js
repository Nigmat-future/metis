const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { previewWorkflow, stableJson } = require('../workflows');
const { buildGuiViewModel } = require('../ui/view-model');
const { listProposals } = require('../core/proposals');
const { renderPreviewHtml } = require('./preview');

function runGuiPreview(root, flags, cwd) {
  const snapshot = previewWorkflow(root, { includeHistory: flags.includeHistory });
  const viewModel = buildGuiViewModel(snapshot.pipeline, snapshot.generated, {
    proposalSummaries: listProposals(root).proposals,
  });
  if (flags.json) {
    return { exitCode: 0, stdout: `${stableJson(viewModel)}\n`, stderr: '' };
  }
  const html = renderPreviewHtml(viewModel);
  const outPath = flags.out || path.join(os.tmpdir(), `metis-preview-${Date.now()}.html`);
  const absoluteOut = path.resolve(cwd, outPath);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, html, 'utf8');
  return {
    exitCode: 0,
    stdout: `Metis GUI preview written to: ${absoluteOut}\n`,
    stderr: '',
  };
}

module.exports = { runGuiPreview };
