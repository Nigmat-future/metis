// Workflows for capturing corrections: `note` records one by hand, `learn`
// reads agent transcripts (opt-in) and appends the corrections it finds. Both
// feed the same redacted log the corrections adapter scans, so a captured
// correction flows straight into scan -> plan -> diff.

const { appendCorrection, readCorrections } = require('../core/corrections-store');
const { readTranscriptCorrections } = require('../adapters/transcript');
const { extractRevertCorrections } = require('../adapters/git-history');
const { stableJson } = require('./index');

const LEARN_SOURCES = new Set(['claude', 'git', 'all']);

function noteWorkflow(root, text, options = {}) {
  if (!text || !String(text).trim()) {
    return err(2, 'note requires a non-empty correction string\n');
  }
  let record;
  try {
    record = appendCorrection(root, { text, source: options.source || 'manual' });
  } catch (error) {
    return err(1, `${error.message}\n`);
  }
  return ok(`Captured ${record.type} correction ${record.id}.\nRun "metis plan" to see it weighed against your other rules.\n`);
}

function learnWorkflow(root, options = {}) {
  const source = options.source || 'claude';
  if (!LEARN_SOURCES.has(source)) {
    return err(2, `learn supports --source claude, git, or all in this release (got: ${source})\n`);
  }
  const found = gatherCorrections(root, source);
  if (options.json && options.dryRun) {
    return ok(`${stableJson({ source, found: found.length, corrections: found })}\n`);
  }
  if (!found.length) {
    return ok(`No corrections found for source "${source}" in this project.\n`);
  }
  if (options.dryRun) {
    return ok(previewText(found, source));
  }
  // Capture mode: de-duplicate against what is already logged by fingerprint.
  const seen = new Set(readCorrections(root).map((r) => r.fingerprint));
  let added = 0;
  for (const item of found) {
    if (seen.has(item.fingerprint)) continue;
    try {
      appendCorrection(root, { text: item.text, source: item.source, sessionId: item.sessionId });
      seen.add(item.fingerprint);
      added += 1;
    } catch (_) {
      // Skip anything that no longer classifies as a correction after redaction.
    }
  }
  return ok(`Captured ${added} new correction(s) from source "${source}".\nRun "metis plan" to review them.\n`);
}

// Transcript reading is the only source that reaches outside the repo, so it
// stays gated behind an explicit claude/all selection.
function gatherCorrections(root, source) {
  const found = [];
  if (source === 'claude' || source === 'all') found.push(...readTranscriptCorrections(root));
  if (source === 'git' || source === 'all') found.push(...extractRevertCorrections(root));
  return found;
}

function previewText(found, source = 'claude') {
  const lines = found.map((item) => `  [${item.type}] ${item.text}`);
  return [
    `Found ${found.length} correction(s) from source "${source}" (preview only, nothing captured):`,
    ...lines,
    '',
    'Re-run with --yes to append these to your redacted corrections log.',
    '',
  ].join('\n');
}

function ok(stdout) {
  return { exitCode: 0, stdout, stderr: '' };
}

function err(exitCode, stderr) {
  return { exitCode, stdout: '', stderr };
}

module.exports = { noteWorkflow, learnWorkflow };
