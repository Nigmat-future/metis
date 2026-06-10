// Append-only store for captured corrections, kept as JSON Lines under
// .metis/corrections/log.jsonl. Every record is redacted at write time so the
// log never holds raw secrets, and reads tolerate partial/corrupt lines.

const fs = require('node:fs');
const path = require('node:path');
const { METIS_CORRECTIONS_LOG_PATH, MAX_CORRECTIONS_LOG_BYTES } = require('./artifacts');
const { ensureInsidePath, safeLstat } = require('./fs-safe');
const { createRedactor } = require('./redactor');
const { classifyCorrection, fingerprint } = require('./correction-signals');
const { sanitizeDisplayText } = require('./display');

let sequence = 0;

function appendCorrection(root, { text, source = 'manual', sessionId = null, at = null } = {}) {
  const classified = classifyCorrection(text);
  if (!classified.isCorrection) {
    throw new Error('Refusing to log text that is not a correction');
  }
  const redactor = createRedactor();
  const redacted = redactor.redact(text);
  const record = {
    id: makeCorrectionId(),
    source: sanitizeDisplayText(String(source || 'manual'), 64),
    type: classified.type,
    signals: classified.signals,
    text: sanitizeDisplayText(redacted.text, 280),
    fingerprint: fingerprint(redacted.text),
    sessionId: sessionId ? sanitizeDisplayText(String(sessionId), 80) : null,
    redactions: redacted.redactions,
    at: at || new Date().toISOString(),
  };
  writeLine(root, record);
  return record;
}

function readCorrections(root) {
  const target = safeLstat(root, METIS_CORRECTIONS_LOG_PATH);
  if (target.status !== 'present' || !target.stat.isFile()) return [];
  let raw;
  try {
    raw = fs.readFileSync(target.absolutePath, 'utf8');
  } catch (_) {
    return [];
  }
  const records = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const value = JSON.parse(trimmed);
      if (value && typeof value === 'object' && value.id && value.fingerprint) records.push(value);
    } catch (_) {
      // Skip a corrupt line; never let one bad record break the whole read.
    }
  }
  return records;
}

function writeLine(root, record) {
  const absolutePath = ensureInsidePath(root, METIS_CORRECTIONS_LOG_PATH);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const line = `${JSON.stringify(record)}\n`;
  let existingSize = 0;
  try {
    existingSize = fs.statSync(absolutePath).size;
  } catch (_) {
    existingSize = 0;
  }
  if (existingSize + Buffer.byteLength(line, 'utf8') > MAX_CORRECTIONS_LOG_BYTES) {
    throw new Error('Corrections log exceeds max size; archive or prune it before adding more');
  }
  fs.appendFileSync(absolutePath, line, 'utf8');
}

function makeCorrectionId() {
  sequence += 1;
  return `corr_${Date.now().toString(36)}_${sequence.toString(36).padStart(4, '0')}`;
}

module.exports = { appendCorrection, readCorrections };
