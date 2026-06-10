// Git-history adapter: discovers corrections from revert/undo commits. When a
// developer reverts or fixes a recent change, that is a correction signal with
// zero privacy cost — it reads only commit subjects from the local repo, makes
// no network calls, and never inspects diffs or content.
//
// `git` is injected (spawnSync wrapper) so the adapter is deterministic in tests
// without a real repository.

const { spawnSync } = require('node:child_process');
const { classifyCorrection, fingerprint } = require('../core/correction-signals');
const { createRedactor } = require('../core/redactor');
const { sanitizeDisplayText } = require('../core/display');

const REVERT_RE = /^(?:revert\b|revert:|fix:\s*(?:undo|revert|roll ?back)\b)/i;
const MAX_COMMITS = 200;

function defaultGit(root) {
  return (args) => {
    const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
    return { status: typeof result.status === 'number' ? result.status : 1, stdout: result.stdout || '' };
  };
}

function extractRevertCorrections(root, options = {}) {
  const git = options.git || defaultGit(root);
  if (git(['rev-parse', '--git-dir']).status !== 0) return [];
  const log = git(['log', `-${MAX_COMMITS}`, '--no-merges', '--format=%s']);
  if (log.status !== 0) return [];

  const redactor = createRedactor();
  const found = [];
  for (const line of String(log.stdout).split(/\r?\n/)) {
    const subject = line.trim();
    if (!subject || !REVERT_RE.test(subject)) continue;
    const classified = classifyCorrection(subject);
    // A revert subject is an undo even if the wording does not trip the lexical
    // classifier, so we record the structural signal regardless.
    const redacted = redactor.redact(subject);
    found.push({
      source: 'git:revert',
      type: classified.isCorrection ? classified.type : 'undo',
      signals: classified.signals.length ? classified.signals : ['undo'],
      text: sanitizeDisplayText(redacted.text, 200),
      fingerprint: fingerprint(redacted.text),
      sessionId: null,
      redactions: redacted.redactions,
    });
  }
  return found;
}

module.exports = { extractRevertCorrections };
