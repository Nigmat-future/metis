function parseKeyChunk(chunk) {
  const text = String(chunk || '');
  const keys = [];
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text.slice(index, index + 3);
    if (next === '\x1b[A') {
      keys.push({ type: 'up' });
      index += 2;
    } else if (next === '\x1b[B') {
      keys.push({ type: 'down' });
      index += 2;
    } else if (char === '\x03') {
      keys.push({ type: 'ctrl-c' });
    } else if (char === '\t') {
      keys.push({ type: 'tab' });
    } else if (char === '\r' || char === '\n') {
      keys.push({ type: 'enter' });
      if (char === '\r' && text[index + 1] === '\n') index += 1;
    } else if (char === '\x7f') {
      keys.push({ type: 'backspace' });
    } else if (!/[\u0000-\u001f]/.test(char)) {
      keys.push({ type: 'text', value: char });
    }
  }
  return keys;
}

module.exports = { parseKeyChunk };
