const RESET = '\x1b[0m';

const COLORS = {
  accent: [122, 214, 157],
  bronze: [199, 167, 106],
  dim: [141, 154, 146],
  text: [232, 238, 232],
  border: [68, 87, 73],
  danger: [229, 111, 111],
};

const SPINNER = ['-', '\\', '|', '/'];

function paint(text, role, enabled) {
  if (!enabled) return String(text);
  const rgb = COLORS[role] || COLORS.text;
  return `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m${text}${RESET}`;
}

function spinner(frame) {
  return SPINNER[Math.abs(Number(frame) || 0) % SPINNER.length];
}

function screenUpdate(frame, firstPaint) {
  const prefix = firstPaint ? '\x1b[2J\x1b[H' : '\x1b[H\x1b[J';
  return `${prefix}${frame}`;
}

module.exports = {
  RESET,
  paint,
  screenUpdate,
  spinner,
};
