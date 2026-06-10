// Pure, deterministic classification of "corrections": turns where a developer
// pushes back on or re-directs an agent. No I/O, no network, no LLM — this is
// the foundation the corrections adapter and extractor build on.
//
// A correction is one of three types, checked in precedence order:
//   negation      "don't / stop / 不要 / 别" — reject what the agent did
//   reinstruction "actually / I said / 我说过 / 再来" — re-state intent
//   undo          "revert / undo / roll back / 撤销 / 回退" — take it back

const NEGATION_RE = /\b(?:don['’]?t|do not|never|stop|avoid|no longer)\b/i;
const NEGATION_CJK_RE = /(?:不要|别|不能|不准|禁止|不应该)/;
const REINSTRUCTION_RE = /\b(?:actually|i said|i told you|as i said|again|once more|let me repeat|i already said)\b/i;
const REINSTRUCTION_CJK_RE = /(?:我说过|我说了|再来一次|重来|再来|说过了|我要求过)/;
const UNDO_RE = /\b(?:revert|undo|roll ?back|take that back|put it back)\b/i;
const UNDO_CJK_RE = /(?:撤销|撤回|回退|还原|改回去|恢复原样)/;

// Markers that introduce a correction but carry no intent — stripped from the
// fingerprint so "don't run the build" and "actually run the build" cluster.
const LEADING_MARKER_RE = /^(?:no[,.\s]+|nope[,.\s]+|actually[,.\s]+|dont|do not|never|stop|please dont|wait[,.\s]+|i said|as i said|again|instead[,.\s]+)\s*/i;

function classifyCorrection(input) {
  if (typeof input !== 'string' || !input.trim()) return notCorrection();
  const text = input.trim();
  const signals = [];
  if (NEGATION_RE.test(text) || NEGATION_CJK_RE.test(text)) signals.push('negation');
  if (REINSTRUCTION_RE.test(text) || REINSTRUCTION_CJK_RE.test(text)) signals.push('reinstruction');
  if (UNDO_RE.test(text) || UNDO_CJK_RE.test(text)) signals.push('undo');
  if (!signals.length) return notCorrection();
  return { isCorrection: true, type: primaryType(signals), signals };
}

// Precedence: a negation is the strongest reject signal, then undo (an explicit
// take-back), then a plain re-instruction.
function primaryType(signals) {
  if (signals.includes('negation')) return 'negation';
  if (signals.includes('undo')) return 'undo';
  return 'reinstruction';
}

function fingerprint(input) {
  if (typeof input !== 'string' || !input.trim()) return '';
  return input
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(LEADING_MARKER_RE, '')
    .replace(/[^a-z0-9一-鿿\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function notCorrection() {
  return { isCorrection: false, type: null, signals: [] };
}

module.exports = { classifyCorrection, fingerprint };
