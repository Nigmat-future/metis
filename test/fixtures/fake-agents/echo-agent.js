#!/usr/bin/env node
// Deterministic fake coding-agent CLI used by driver tests. It stands in for
// claude / codex / opencode / cursor in headless mode: it locates the prompt
// (from `-p <prompt>` or as the trailing argument used by exec/run dialects),
// echoes it, and prints a JSON line carrying a resumable session id so the
// driver's session-id capture can be exercised. Prompt "BOOM" exits non-zero.

const args = process.argv.slice(2);

function findPrompt() {
  const flagIndex = args.indexOf('-p');
  if (flagIndex !== -1 && args[flagIndex + 1] != null) return args[flagIndex + 1];
  return args.length ? args[args.length - 1] : '';
}

const prompt = findPrompt();
if (prompt === 'BOOM') {
  process.stderr.write('fake-agent: forced failure\n');
  process.exit(3);
}
process.stdout.write(`ECHO: ${prompt}\n`);
process.stdout.write('{"session_id":"fake-123","sessionID":"fake-123","chatId":"fake-123"}\n');
