const { paint } = require('./theme');

function row(text, width, color) {
  return `${paint('\u2502', 'border', color)}${fit(text, width)}${paint('\u2502', 'border', color)}`;
}

function splitLines(text, maxLines) {
  return String(text || '').split(/\r?\n/).slice(0, maxLines);
}

function pad(text, width) {
  const value = String(text || '');
  if (value.length >= width) return value.slice(0, width - 1);
  return `${value}${' '.repeat(width - value.length)}`;
}

function fit(text, width) {
  const value = String(text || '');
  const visible = stripAnsi(value);
  if (visible.length === width) return value;
  if (visible.length > width) return value.includes('\x1b[') ? value : clip(value, width);
  return `${value}${' '.repeat(width - visible.length)}`;
}

function clip(text, width) {
  const value = String(text || '');
  if (value.length <= width) return value;
  return `${value.slice(0, Math.max(0, width - 1))}\u2026`;
}

function stripAnsi(text) {
  return String(text || '').replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
}

module.exports = { clip, fit, pad, row, splitLines };
