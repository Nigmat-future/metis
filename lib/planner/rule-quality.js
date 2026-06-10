const VAGUE_TERMS = [
  'best practices',
  'properly',
  'appropriately',
  'as needed',
  'when possible',
  'etc',
  'things',
  'stuff',
  'clean code',
];

const IMPERSONAL_TERMS = [
  'you are',
  'system prompt',
  'chain of thought',
  'autonomous agent',
  'tool list',
  'must always',
  'never ever',
];

const NEGATIVE_PREFIX = /^(?:do\s+not|never|avoid)\s+/i;

function assessRuleQuality(candidates) {
  const normalizedCounts = new Map();
  const positiveBodies = new Set();
  for (const candidate of candidates) {
    const normalized = normalizeRule(candidate.body);
    normalizedCounts.set(normalized, (normalizedCounts.get(normalized) || 0) + 1);
    if (!NEGATIVE_PREFIX.test(normalized)) positiveBodies.add(normalized);
  }

  const items = candidates.map((candidate) => {
    const issues = assessCandidate(candidate, normalizedCounts, positiveBodies);
    return {
      candidateId: candidate.id,
      title: candidate.title,
      status: issues.length ? 'needs-review' : 'pass',
      issues,
    };
  });

  const pass = items.filter((item) => item.status === 'pass').length;
  return {
    summary: {
      total: candidates.length,
      pass,
      needsReview: candidates.length - pass,
    },
    items,
  };
}

function assessCandidate(candidate, normalizedCounts, positiveBodies) {
  const body = candidate.body || '';
  const normalized = normalizeRule(body);
  const issues = [];

  if (wordCount(body) > 24) {
    issues.push(issue('overstuffed', 'keep personal rules under 24 words'));
  }
  if (containsTerm(normalized, VAGUE_TERMS)) {
    issues.push(issue('vague', 'replace vague wording with concrete personal behavior'));
  }
  if (containsTerm(normalized, IMPERSONAL_TERMS)) {
    issues.push(issue('impersonal', 'write as a personal rule, not a system prompt'));
  }
  if ((normalizedCounts.get(normalized) || 0) > 1) {
    issues.push(issue('duplicate', 'merge exact duplicate personal rules'));
  }
  if (conflictsWithPositiveRule(normalized, positiveBodies)) {
    issues.push(issue('conflict', 'resolve contradictory positive and negative rules'));
  }

  return issues;
}

function conflictsWithPositiveRule(normalized, positiveBodies) {
  if (!NEGATIVE_PREFIX.test(normalized)) return false;
  const positive = normalized.replace(NEGATIVE_PREFIX, '').trim();
  return positiveBodies.has(positive);
}

function containsTerm(normalized, terms) {
  return terms.some((term) => normalized.includes(term));
}

function normalizeRule(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[`'"]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(text) {
  return String(text || '').split(/\s+/).filter(Boolean).length;
}

function issue(type, message) {
  return `${type}: ${message}`;
}

module.exports = { assessRuleQuality };
