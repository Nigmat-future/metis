function buildEvolveChanges(pipeline, previous) {
  const currentByTitle = indexCandidates(pipeline.candidates);
  const previousByTitle = indexCandidates(previous.candidates || []);
  const additions = diffTitles(currentByTitle, previousByTitle);
  const removals = diffTitles(previousByTitle, currentByTitle);
  const updates = changedTitles(currentByTitle, previousByTitle);
  const changes = [];

  for (const title of additions) {
    changes.push(changeEntry('add', title, currentByTitle.get(title), null));
  }
  for (const title of updates) {
    changes.push(changeEntry('update', title, currentByTitle.get(title), previousByTitle.get(title)));
  }
  for (const title of removals) {
    changes.push(changeEntry('remove', title, null, previousByTitle.get(title)));
  }
  return changes;
}

function changeEntry(kind, title, current, previous) {
  const currentTokens = tokenCost(current);
  const previousTokens = tokenCost(previous);
  const candidate = current || previous;
  return {
    kind,
    title,
    evidenceIds: candidate && Array.isArray(candidate.evidenceIds) ? candidate.evidenceIds : [],
    tokenImpact: currentTokens - previousTokens,
    current: current || null,
    previous: previous || null,
  };
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

function tokenCost(candidate) {
  return candidate && Number.isFinite(candidate.tokenCostEstimate) ? candidate.tokenCostEstimate : 0;
}

module.exports = { buildEvolveChanges };
