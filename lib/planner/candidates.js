const { assessRuleQuality } = require('./rule-quality');

function planCandidates(behaviors) {
  const candidates = behaviors.map(toCandidate).sort((a, b) => a.id.localeCompare(b.id));
  const quality = assessRuleQuality(candidates);
  const qualityById = new Map(quality.items.map((item) => [item.candidateId, item]));
  return candidates.map((candidate) => ({
    ...candidate,
    quality: qualityById.get(candidate.id),
  }));
}

function toCandidate(behavior, index) {
  const score = scoreBehavior(behavior);
  const risk = riskLevel(behavior.risks);
  const decision = decisionFor(score, risk);
  const tokenCostEstimate = wordCount(behavior.body);
  return {
    id: `cand_${String(index + 1).padStart(6, '0')}`,
    title: behavior.title,
    body: trimWords(behavior.body, 30),
    confidence: confidenceLabel(score),
    score: Number(score.toFixed(2)),
    tokenCostEstimate,
    evidenceIds: behavior.evidenceIds,
    targets: behavior.targets,
    risk,
    decision,
    reviewReason: reviewReason(decision, risk, behavior),
  };
}

function scoreBehavior(behavior) {
  let score = behavior.baseScore;
  if (behavior.evidenceIds.length > 1) score += 0.1;
  if (behavior.contradictions.length) score -= 0.2;
  if (behavior.risks.length) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

function riskLevel(risks) {
  if (risks.some((risk) => ['prompt-injection', 'dangerous-command', 'broad-filesystem-access'].includes(risk))) return 'high';
  if (risks.length) return 'medium';
  return 'low';
}

function decisionFor(score, risk) {
  if (risk === 'high') return 'block';
  if (score >= 0.8 && risk === 'low') return 'generate';
  if (score >= 0.55) return 'needs-review';
  return 'document-only';
}

function confidenceLabel(score) {
  if (score >= 0.8) return 'high';
  if (score >= 0.55) return 'medium';
  return 'needs-review';
}

function reviewReason(decision, risk, behavior) {
  if (decision === 'block') return `Blocked by ${risk} risk evidence.`;
  if (decision === 'needs-review') return 'Needs human review before becoming an active rule.';
  if (decision === 'document-only') return 'Low confidence; keep as documentation only.';
  if (behavior.contradictions.length) return 'Contradictory evidence detected.';
  return '';
}

function trimWords(text, maxWords) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}.`;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

module.exports = { planCandidates };
