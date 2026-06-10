const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const SECRET_KEY_RE = /(secret|token|password|api[_-]?key|credential|bearer)/i;
const WIN_HOME_RE = /[A-Z]:\\Users\\[^\\\s]+/gi;
const MAC_HOME_RE = /\/Users\/[^/\s]+/g;
const NIX_HOME_RE = /\/home\/[^/\s]+/g;
const PRIVATE_HOST_RE = /\b(?:internal|customer)\.[a-z0-9.-]+\b/gi;

function sanitizeDisplayText(value, limit = 120) {
  const text = String(value ?? '')
    .replace(CONTROL_RE, '')
    .replace(WIN_HOME_RE, '~')
    .replace(MAC_HOME_RE, '~')
    .replace(NIX_HOME_RE, '~')
    .replace(PRIVATE_HOST_RE, '[redacted-host]');
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function sanitizeDisplayPath(root, absolutePath) {
  const normalized = String(absolutePath || '').replaceAll('\\', '/');
  const rootText = String(root || '').replaceAll('\\', '/');
  if (normalized === rootText) return '.';
  if (normalized.startsWith(`${rootText}/`)) {
    return sanitizeDisplayText(normalized.slice(rootText.length + 1), 160);
  }
  return sanitizeDisplayText(normalized, 160);
}

function sanitizeJsonKey(key) {
  const clean = sanitizeDisplayText(key, 80);
  if (SECRET_KEY_RE.test(clean)) return '[redacted-key]';
  return clean;
}

function formatFinding(finding) {
  return `${finding.displayPath}: ${finding.summary}`;
}

module.exports = {
  formatFinding,
  sanitizeDisplayPath,
  sanitizeDisplayText,
  sanitizeJsonKey,
};
