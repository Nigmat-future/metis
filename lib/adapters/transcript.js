// Transcript adapter: reads coding-agent session transcripts to discover
// corrections the developer already made in chat. This is the highest-value
// source and the most sensitive, so it is strictly OPT-IN: nothing here runs
// unless the user invokes `metis learn`, and every extracted line is redacted.
//
// Claude Code stores transcripts as JSON Lines under
//   <home>/.claude/projects/<encoded-project-path>/<session>.jsonl
// where the project path is encoded by replacing non-alphanumeric characters
// with dashes (e.g. "E:\Coding Agent" -> "E--Coding-Agent").

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { classifyCorrection, fingerprint } = require('../core/correction-signals');
const { createRedactor } = require('../core/redactor');
const { sanitizeDisplayText } = require('../core/display');

function encodeProjectDir(root) {
  return String(root).replace(/[^a-zA-Z0-9]/g, '-');
}

function readTranscriptCorrections(root, options = {}) {
  const home = options.home || os.homedir();
  const dir = path.join(home, '.claude', 'projects', encodeProjectDir(root));
  let files;
  try {
    files = fs.readdirSync(dir).filter((name) => name.endsWith('.jsonl')).sort();
  } catch (_) {
    return [];
  }
  const redactor = createRedactor();
  const found = [];
  for (const file of files) {
    const sessionId = file.replace(/\.jsonl$/, '');
    for (const text of userTurns(path.join(dir, file))) {
      const classified = classifyCorrection(text);
      if (!classified.isCorrection) continue;
      const redacted = redactor.redact(text);
      found.push({
        source: 'transcript:claude',
        type: classified.type,
        signals: classified.signals,
        text: sanitizeDisplayText(redacted.text, 280),
        fingerprint: fingerprint(redacted.text),
        sessionId,
        redactions: redacted.redactions,
      });
    }
  }
  return found;
}

function userTurns(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return [];
  }
  const turns = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch (_) {
      continue;
    }
    if (entry && entry.type === 'user' && entry.message) {
      const text = contentText(entry.message.content);
      if (text) turns.push(text);
    }
  }
  return turns;
}

function contentText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join(' ')
      .trim();
  }
  return '';
}

module.exports = { readTranscriptCorrections, encodeProjectDir };
