/**
 * Metis mark — counsel funnel (4 lines)
 *
 *   · · ·     scattered local traces
 *   \ | /     Metis narrows history into reviewable rules
 *   METIS     wordmark
 *   tagline   brand promise
 */
const { paint } = require('./theme');

const BRAND_TAGLINE = 'history is your config';

const LOGO_SEGMENTS = [
  { text: '        · · · · ·', role: 'dim' },
  { text: '          \\   |   /', role: 'border' },
  { text: '       ═══ METIS ═══', role: 'accent' },
  { text: `    ${BRAND_TAGLINE}`, role: 'dim' },
];

function renderLogo(width, color) {
  return LOGO_SEGMENTS.map((segment) => center(renderSegment(segment, color), width));
}

function renderSegment(segment, color) {
  if (!color) return segment.text;
  return paint(segment.text, segment.role, color);
}

function center(text, width) {
  const plain = stripAnsi(text);
  const left = Math.max(0, Math.floor((width - plain.length) / 2));
  return fit(`${' '.repeat(left)}${text}`, width);
}

function fit(text, width) {
  const plain = stripAnsi(String(text));
  if (plain.length >= width) return String(text).slice(0, width);
  return `${text}${' '.repeat(width - plain.length)}`;
}

function stripAnsi(text) {
  return String(text || '').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

module.exports = {
  BRAND_TAGLINE,
  LOGO_SEGMENTS,
  renderLogo,
};
