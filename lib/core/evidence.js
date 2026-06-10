const { sanitizeDisplayText, sanitizeJsonKey } = require('./display');

function createEvidenceBuilder(scanContext) {
  const entries = [];
  return {
    addEvidence(partial) {
      entries.push(normalizeEvidence(scanContext, partial));
    },
    finalize() {
      return assignIds(sortEvidence(entries));
    },
  };
}

function normalizeEvidence(context, partial) {
  for (const field of ['source', 'adapter', 'kind', 'rootRelativePath', 'status', 'summary']) {
    if (!partial[field]) throw new EvidenceError(`Evidence missing ${field}`);
  }
  const redactedPath = context.redactor.redactPath(partial.rootRelativePath);
  const displayPath = partial.displayPath ? context.redactor.redactPath(partial.displayPath) : redactedPath;
  const summary = context.redactor.redact(partial.summary);
  const redacted = context.redactor.redact(partial.excerpt || '');
  const details = sanitizeDetails(context.redactor, partial.details || {});
  return {
    id: '',
    source: partial.source,
    adapter: partial.adapter,
    kind: partial.kind,
    rootRelativePath: normalizeRelativePath(redactedPath.text),
    displayPath: sanitizeDisplayText(displayPath.text, 160),
    status: partial.status,
    summary: sanitizeDisplayText(summary.text, 180),
    confidence: partial.confidence ?? 0.5,
    sensitivity: partial.sensitivity || 'metadata',
    provenance: {
      scanRoot: '.',
      sizeBytes: partial.sizeBytes || 0,
      mtimeMs: partial.mtimeMs || 0,
    },
    signals: [...new Set(partial.signals || [])].sort(),
    risks: [...new Set(partial.risks || [])].sort(),
    redactions: mergeRedactions([
      ...(partial.redactions || []),
      ...redactedPath.redactions,
      ...displayPath.redactions,
      ...summary.redactions,
      ...redacted.redactions,
      ...details.redactions,
    ]),
    contradictions: [...new Set(partial.contradictions || [])].sort(),
    targets: [...new Set(partial.targets || [])].sort(),
    excerpt: redacted.text ? sanitizeDisplayText(redacted.text, 180) : undefined,
    details: details.value,
  };
}

function sortEvidence(evidenceList) {
  return [...evidenceList].sort((a, b) => {
    const left = `${a.source}:${a.kind}:${a.rootRelativePath}:${a.summary}`;
    const right = `${b.source}:${b.kind}:${b.rootRelativePath}:${b.summary}`;
    return left.localeCompare(right);
  });
}

function summarizeEvidence(evidenceList) {
  return evidenceList.reduce((summary, item) => {
    summary.sources[item.source] = (summary.sources[item.source] || 0) + 1;
    if (item.kind === 'history-snippet') summary.historySnippets += 1;
    return summary;
  }, { sources: {}, historySnippets: 0 });
}

function assignIds(evidenceList) {
  return evidenceList.map((item, index) => ({ ...item, id: `ev_${String(index + 1).padStart(6, '0')}` }));
}

function normalizeRelativePath(value) {
  return String(value).replaceAll('\\', '/').replace(/^\/+/, '') || '.';
}

function mergeRedactions(redactions) {
  const counts = new Map();
  for (const item of redactions) counts.set(item.type, (counts.get(item.type) || 0) + item.count);
  return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => a.type.localeCompare(b.type));
}

function sanitizeDetails(redactor, details) {
  const redactions = [];
  const value = Object.keys(details).sort().reduce((result, key) => {
    const cleanKeyResult = redactor.redact(key);
    const cleanKey = sanitizeJsonKey(cleanKeyResult.text);
    redactions.push(...cleanKeyResult.redactions);
    const value = details[key];
    result[cleanKey] = Array.isArray(value)
      ? value.map((item) => redactDisplayValue(redactor, item, redactions))
      : redactDisplayValue(redactor, value, redactions);
    return result;
  }, {});
  return { redactions, value };
}

function redactDisplayValue(redactor, value, redactions) {
  const redacted = redactor.redact(value);
  redactions.push(...redacted.redactions);
  return sanitizeDisplayText(redacted.text, 160);
}

class EvidenceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EvidenceError';
  }
}

module.exports = {
  EvidenceError,
  createEvidenceBuilder,
  normalizeEvidence,
  sortEvidence,
  summarizeEvidence,
};
