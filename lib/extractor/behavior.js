function extractBehaviors(evidence) {
  const behaviors = [];
  for (const item of evidence) {
    behaviors.push(...fromEvidence(item));
  }
  return dedupeBehaviors(behaviors);
}

function fromEvidence(item) {
  const result = [];
  const text = evidenceText(item);
  if (item.kind === 'correction') {
    result.push(correctionBehavior(item));
    return result;
  }
  const verificationCommand = extractVerificationCommand(item, text);
  if (verificationCommand) {
    result.push(behavior('verification-command', `Run ${verificationCommand} before final answer`, `Prefer \`${verificationCommand}\` before reporting completion.`, item, 0.85));
  }
  if (item.signals.includes('lint-command')) {
    result.push(behavior('lint-command', 'Run the project lint command during review', 'Use the detected lint script when code changes touch source files.', item, 0.75));
  }
  if (item.signals.includes('build-command')) {
    result.push(behavior('build-command', 'Run the project build command for release-like changes', 'Use the detected build command before claiming release readiness.', item, 0.72));
  }
  if (item.signals.includes('language-preference') || /Chinese(?:-simplified)?|Simplified Chinese|中文|简体/i.test(text)) {
    result.push(behavior('language-preference', 'Respond in Simplified Chinese when instructed', 'Respond in Simplified Chinese when project instructions require it.', item, 0.82));
  }
  if (item.signals.includes('privacy-rule') || /no remote calls|local-first|no telemetry|no raw secret|privacy|private|secret|redacted/i.test(text)) {
    result.push(behavior('privacy-rule', 'Keep agent scaffolds local and redacted', 'Keep generated rules local, redacted, and reviewable before apply.', item, 0.78));
  }
  if (item.kind === 'instruction-file' && item.adapter === 'claude-code') {
    result.push(behavior('instruction-rule', 'Preserve existing Claude Code project instructions', 'Preserve manual Claude Code instructions outside PCA managed sections.', item, 0.72));
  }
  if (item.kind === 'instruction-file' && item.adapter === 'codex') {
    result.push(behavior('instruction-rule', 'Respect AGENTS.md hierarchy and precedence', 'Respect deeper AGENTS.md files when project instructions overlap.', item, 0.76));
  }
  if (item.kind === 'hooks') {
    result.push(behavior('hook-workflow', 'Review hook workflows before generating rules', 'Document hook workflows as review notes before turning them into active rules.', item, 0.58));
  }
  if (item.kind === 'mcp') {
    result.push(behavior('mcp-usage', 'Review MCP metadata before enabling tools', 'Review MCP metadata before carrying tool permissions into generated rules.', item, 0.56));
  }
  if (item.risks.length) {
    result.push(behavior('risk', 'Review risky evidence before generation', 'Keep risky evidence in review notes instead of active rules.', item, 0.4));
  }
  return result;
}

function evidenceText(item) {
  const detailsText = Object.values(item.details || {}).flat().join(' ');
  return `${item.summary} ${item.excerpt || ''} ${detailsText}`.trim();
}

function extractVerificationCommand(item, text) {
  const details = item.details || {};
  const commandText = [details.command, item.excerpt, item.summary, text].filter(Boolean).join(' ');
  const npmTest = /\bnpm\s+test\b/i.exec(commandText);
  if (npmTest) return npmTest[0].toLowerCase();
  if (item.kind === 'project-script' && typeof details.command === 'string' && details.command.trim()) {
    return details.command.trim();
  }
  return item.signals.includes('verification-command') && /\b(final answer|final completion|reporting completion)\b/i.test(commandText)
    ? 'npm test'
    : '';
}

function behavior(type, title, body, evidence, score) {
  return {
    type,
    title,
    body,
    baseScore: score,
    evidenceIds: [evidence.id],
    targets: evidence.targets,
    risks: evidence.risks,
    redactions: evidence.redactions,
    contradictions: evidence.contradictions,
  };
}

// A repeated correction becomes a behavior whose confidence scales with how
// often it recurred. The frequency field rides through to the planner, which
// gives recurrent corrections a scoring boost.
function correctionBehavior(item) {
  const frequency = Number(item.details && item.details.frequency) || 1;
  const example = item.excerpt || item.summary;
  const trimmed = example.length > 60 ? `${example.slice(0, 57)}...` : example;
  return {
    type: `correction-${(item.details && item.details.type) || 'general'}`,
    title: `Repeated correction: ${trimmed}`,
    body: `You corrected this ${frequency === 1 ? 'once' : `${frequency} times`}. ${example}.`,
    baseScore: correctionScore(frequency),
    frequency,
    evidenceIds: [item.id],
    targets: item.targets,
    risks: item.risks,
    redactions: item.redactions,
    contradictions: [],
  };
}

function correctionScore(frequency) {
  if (frequency >= 4) return 0.85;
  if (frequency === 3) return 0.72;
  if (frequency === 2) return 0.58;
  return 0.4;
}

function dedupeBehaviors(behaviors) {
  const byTitle = new Map();
  for (const item of behaviors) {
    const existing = byTitle.get(item.title);
    if (!existing) {
      byTitle.set(item.title, { ...item });
      continue;
    }
    existing.baseScore = Math.max(existing.baseScore, item.baseScore);
    existing.evidenceIds = [...new Set([...existing.evidenceIds, ...item.evidenceIds])].sort();
    existing.targets = [...new Set([...existing.targets, ...item.targets])].sort();
    existing.risks = [...new Set([...existing.risks, ...item.risks])].sort();
    existing.redactions = [...existing.redactions, ...item.redactions];
    existing.contradictions = [...new Set([...existing.contradictions, ...item.contradictions])].sort();
  }
  return [...byTitle.values()].sort((a, b) => a.title.localeCompare(b.title));
}

module.exports = { extractBehaviors };
