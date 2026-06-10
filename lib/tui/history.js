function createCommandHistory() {
  const entries = [];
  let cursor = 0;
  return {
    push(value) {
      const trimmed = String(value || '').trim();
      if (!trimmed) return;
      if (entries[entries.length - 1] !== trimmed) entries.push(trimmed);
      cursor = entries.length;
    },
    previous() {
      if (!entries.length) return '';
      cursor = Math.max(0, cursor - 1);
      return entries[cursor] || '';
    },
    next() {
      if (!entries.length) return '';
      cursor = Math.min(entries.length, cursor + 1);
      return entries[cursor] || '';
    },
  };
}

module.exports = { createCommandHistory };
