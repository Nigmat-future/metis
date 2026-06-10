const { getCommandSuggestions } = require('./commands');

function completeCommand(input, state, context = {}) {
  const token = firstToken(input);
  if (!token) return null;
  const matches = getCommandSuggestions(state, context)
    .map((item) => item.name)
    .filter((name) => name.toLowerCase().startsWith(token.toLowerCase()));
  return matches.length === 1 ? matches[0] : null;
}

function inlineSuggestion(input, state, context = {}) {
  const completion = completeCommand(input, state, context);
  if (completion && completion !== input.trim()) return completion.slice(input.trim().length);
  return getCommandSuggestions(state, context).map((item) => item.name).slice(0, 4).join('  ');
}

function firstToken(input) {
  return String(input || '').trim().split(/\s+/)[0] || '';
}

module.exports = { completeCommand, inlineSuggestion };
