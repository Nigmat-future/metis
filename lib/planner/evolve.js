const fs = require('node:fs');
const { ensureInsidePath } = require('../core/fs-safe');
const { evidenceIndexPaths } = require('../core/artifacts');

function evolveDryRun(root, pipeline) {
  if (!pipeline.audit.ok) {
    return {
      exitCode: 1,
      stdout: '',
      stderr: formatAuditFailure(pipeline.audit),
    };
  }
  const previous = readPrevious(root);
  const currentByTitle = indexCandidates(pipeline.candidates);
  const previousByTitle = indexCandidates(previous.candidates);
  const additions = diffTitles(currentByTitle, previousByTitle);
  const removals = diffTitles(previousByTitle, currentByTitle);
  const updates = changedTitles(currentByTitle, previousByTitle);
  const lines = ['Evolution proposal:', ''];

  if (!previous.exists) {
    lines.push('  No existing evidence index found; review init --dry-run before apply.');
  }
  for (const title of additions) {
    lines.push(...proposalLines('add rule candidate', currentByTitle.get(title), null));
  }
  for (const title of updates) {
    lines.push(...proposalLines('refresh rule candidate', currentByTitle.get(title), previousByTitle.get(title)));
  }
  for (const title of removals) {
    lines.push(...proposalLines('review stale candidate', null, previousByTitle.get(title)));
  }
  if (!additions.length && !removals.length && !updates.length) lines.push('  No candidate changes detected.');
  lines.push('', `Token impact estimate: ${estimateImpact(currentByTitle, previousByTitle, additions, removals, updates)}`, '', 'Writes: none', '');
  return { exitCode: 0, stdout: lines.join('\n'), stderr: '' };
}

function readPrevious(root) {
  for (const relativePath of evidenceIndexPaths()) {
    try {
      const text = fs.readFileSync(ensureInsidePath(root, relativePath), 'utf8');
      const parsed = JSON.parse(text);
      return { exists: true, candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [], path: relativePath };
    } catch (_) {
      // Try next path.
    }
  }
  return { exists: false, candidates: [], path: null };
}

function indexCandidates(candidates) {
  return new Map((Array.isArray(candidates) ? candidates : []).map((candidate) => [candidate.title, candidate]));
}

function diffTitles(left, right) {
  return [...left.keys()].filter((title) => !right.has(title)).sort();
}

function changedTitles(currentByTitle, previousByTitle) {
  return [...currentByTitle.keys()].filter((title) => {
    if (!previousByTitle.has(title)) return false;
    return candidateSignature(currentByTitle.get(title)) !== candidateSignature(previousByTitle.get(title));
  }).sort();
}

function candidateSignature(candidate) {
  return JSON.stringify({
    body: candidate.body,
    decision: candidate.decision,
    evidenceIds: candidate.evidenceIds,
    risk: candidate.risk,
    targets: candidate.targets,
    tokenCostEstimate: candidate.tokenCostEstimate,
  });
}

function proposalLines(label, current, previous) {
  const candidate = current || previous;
  const evidenceIds = candidate && Array.isArray(candidate.evidenceIds) ? candidate.evidenceIds : [];
  const currentTokens = tokenCost(current);
  const previousTokens = tokenCost(previous);
  const delta = currentTokens - previousTokens;
  return [
    `  ${label}: ${candidate ? candidate.title : 'unknown candidate'}`,
    `    Evidence: ${evidenceIds.join(', ') || 'none'}`,
    `    Token impact: ${formatSigned(delta)} (${previousTokens} -> ${currentTokens})`,
  ];
}

function tokenCost(candidate) {
  return candidate && Number.isFinite(candidate.tokenCostEstimate) ? candidate.tokenCostEstimate : 0;
}

function estimateImpact(currentByTitle, previousByTitle, additions, removals, updates) {
  const added = additions.reduce((sum, title) => sum + tokenCost(currentByTitle.get(title)), 0);
  const removed = removals.reduce((sum, title) => sum + tokenCost(previousByTitle.get(title)), 0);
  const refreshed = updates.reduce((sum, title) => {
    const current = tokenCost(currentByTitle.get(title));
    const previous = tokenCost(previousByTitle.get(title));
    return sum + (current - previous);
  }, 0);
  const delta = added - removed + refreshed;
  return `+${added} tokens, -${removed} tokens, delta ${formatSigned(delta)}`;
}

function formatAuditFailure(audit) {
  return ['Safety audit failed; evolve blocked.', '', ...audit.issues.map((issue) => `[${issue.severity}] ${issue.message}`), '', 'Writes: none', ''].join('\n');
}

function formatSigned(value) {
  return value >= 0 ? `+${value}` : String(value);
}

module.exports = { evolveDryRun, readPrevious, indexCandidates, diffTitles, changedTitles };
