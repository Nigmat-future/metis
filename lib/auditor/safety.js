const { createRedactor } = require('../core/redactor');

function auditAll({ evidence, candidates, generatedFiles = [] }) {
  const issues = [];
  for (const item of evidence) auditEvidence(item, issues);
  for (const candidate of candidates) auditCandidate(candidate, issues);
  for (const file of generatedFiles) auditGenerated(file, issues);
  return { ok: !issues.some((issue) => issue.severity === 'high'), issues: stableIssues(issues) };
}

function auditEvidence(item, issues) {
  for (const risk of item.risks) {
    if (risk === 'prompt-injection') issues.push(high(`Prompt injection marker redacted in ${item.id}`));
    if (risk === 'dangerous-command') issues.push(high(`Dangerous command evidence in ${item.id}`));
    if (risk === 'broad-filesystem-access') issues.push(high(`Broad filesystem MCP access detected in ${item.id}`));
    if (risk === 'sensitive-metadata') issues.push(medium(`Sensitive metadata redacted in ${item.id}`));
  }
}

function auditCandidate(candidate, issues) {
  if (!candidate.evidenceIds.length) issues.push(high(`Candidate ${candidate.id} has no evidence`));
  if (candidate.decision === 'generate' && candidate.risk !== 'low') {
    issues.push(high(`Candidate ${candidate.id} cannot generate with ${candidate.risk} risk`));
  }
  if (candidate.body.split(/\s+/).filter(Boolean).length > 30) {
    issues.push(medium(`Candidate ${candidate.id} exceeds active rule word budget`));
  }
}

function auditGenerated(file, issues) {
  const redactions = createRedactor().detect(file.content);
  if (redactions.some((item) => item.type === 'api-key' || item.type === 'assignment-secret')) {
    issues.push(high(`Generated ${file.path} contains unredacted secret-like text`));
  }
  if (redactions.some((item) => item.type === 'prompt-injection')) {
    issues.push(high(`Generated ${file.path} contains prompt-injection marker`));
  }
  if (file.content.split(/\r?\n/).length > file.maxLines) {
    issues.push(medium(`Generated ${file.path} exceeds line budget`));
  }
}

function stableIssues(issues) {
  return issues.sort((a, b) => `${a.severity}:${a.message}`.localeCompare(`${b.severity}:${b.message}`));
}

function high(message) {
  return { severity: 'high', message };
}

function medium(message) {
  return { severity: 'medium', message };
}

module.exports = { auditAll };
