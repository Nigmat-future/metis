const API_KEY_RE = /\b(?:sk-ant-|sk-|ghp_|gho_|ghu_|ghs_|ghr_|github_pat_|glpat-|pat_|xox[baprs]-)[a-z0-9][a-z0-9._:-]{8,}\b/gi;
const ASSIGNMENT_SECRET_RE = /\b(?:TOKEN|API_KEY|SECRET|PASSWORD)\s*=\s*[^\s]+/gi;
const PRIVATE_HOST_RE = new RegExp(`\\b(?:h${'t'}${'t'}ps?:\\/\\/)?(?:internal|customer)\\.[a-z0-9.-]+\\b`, 'gi');
const CORP_HOST_RE = /\b[a-z0-9.-]+\.(?:corp|local)\b/gi;
const WIN_HOME_RE = /[A-Z]:\\Users\\[^\\\s]+/gi;
const MAC_HOME_RE = /\/Users\/[^/\s]+/g;
const NIX_HOME_RE = /\/home\/[^/\s]+/g;
const HIGH_ENTROPY_RE = /\b(?=[A-Za-z0-9+/=_-]{33,}\b)(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z0-9+/=_-]+\b/g;
const PROMPT_MARKER_RE = /\b(ignore previous instructions|system prompt|developer message|exfiltrate)\b/gi;

function createRedactor() {
  return { redact, redactPath, detect };
}

function redact(input) {
  let text = String(input ?? '');
  const redactions = [];
  text = replaceWithCount(text, API_KEY_RE, '[redacted:api-key]', redactions, 'api-key');
  text = replaceWithCount(text, ASSIGNMENT_SECRET_RE, '[redacted:assignment-secret]', redactions, 'assignment-secret');
  text = replaceWithCount(text, PRIVATE_HOST_RE, '[redacted:private-host]', redactions, 'private-host');
  text = replaceWithCount(text, CORP_HOST_RE, '[redacted:private-host]', redactions, 'private-host');
  text = replaceWithCount(text, WIN_HOME_RE, '~', redactions, 'private-path');
  text = replaceWithCount(text, MAC_HOME_RE, '~', redactions, 'private-path');
  text = replaceWithCount(text, NIX_HOME_RE, '~', redactions, 'private-path');
  text = replaceWithCount(text, HIGH_ENTROPY_RE, '[redacted:high-entropy]', redactions, 'high-entropy');
  text = replaceWithCount(text, PROMPT_MARKER_RE, '[redacted:prompt-injection]', redactions, 'prompt-injection');
  return { text, redactions };
}

function detect(input) {
  return redact(input).redactions;
}

function redactText(input) {
  return redact(input);
}

function redactPath(input) {
  const redacted = redact(input);
  return {
    text: String(redacted.text || '').replaceAll('\\', '/'),
    redactions: redacted.redactions,
  };
}

function hasHighRiskRedaction(redactions) {
  return (redactions || []).some((item) => item.type === 'prompt-injection' || item.type === 'api-key');
}

function replaceWithCount(text, pattern, replacement, redactions, type) {
  let count = 0;
  const next = text.replace(pattern, () => {
    count += 1;
    return replacement;
  });
  if (count) redactions.push({ type, count });
  return next;
}

module.exports = {
  createRedactor,
  hasHighRiskRedaction,
  redactPath,
  redact,
  redactText,
};
