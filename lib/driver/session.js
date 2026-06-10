// Interactive multi-turn driver session. Each user turn runs the agent CLI once in
// headless mode, reusing the agent's own resume/continue flags so context persists
// across turns without a pseudo-terminal (which keeps this cross-platform).
//
// I/O and the per-turn runner are injectable so the loop is unit-testable.

const { parseSessionRef } = require('./agents');

async function runDriverSession(config) {
  const { agent, root, env, io, runner } = config;
  const timeoutMs = config.timeoutMs;
  const turnOptions = { yolo: config.yolo, model: config.model, json: config.json };
  io.write(header(agent));
  let sessionRef = null;
  let started = false;
  let turns = 0;
  for (;;) {
    const line = await io.prompt(`metis>${agent.id}> `);
    if (line == null) break;
    const text = line.trim();
    if (!text) continue;
    if (text === '/exit' || text === '/quit') break;
    if (text === '/help') { io.write(helpText()); continue; }
    if (text === '/reset') { sessionRef = null; started = false; io.write('Session context reset.\n'); continue; }

    const mode = started ? 'continue' : 'oneShot';
    const result = runner(agent, mode, { prompt: text, sessionRef, ...turnOptions }, { env, cwd: root, timeoutMs });
    if (result && result.notFound) { io.write(notFoundLine(agent)); break; }
    turns += 1;
    started = true;
    io.write(renderTurn(result));
    const ref = parseSessionRef(agent, result.stdout || '');
    if (ref) sessionRef = ref;
    noteDialogs(agent, result.stdout || '', io, config.yolo);
  }
  if (io.close) io.close();
  return { ok: true, turns };
}

function createReadlineIo() {
  const readline = require('node:readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return {
    write: (text) => process.stdout.write(text),
    prompt: (question) => new Promise((resolve) => rl.question(question, (answer) => resolve(answer))),
    close: () => rl.close(),
  };
}

function header(agent) {
  return [
    `Metis driver session - ${agent.name} (${agent.id})`,
    'Each message runs the agent CLI once and continues the same session.',
    'Commands: /help, /reset, /exit.',
    '',
  ].join('\n');
}

function helpText() {
  return ['  /help   show these commands', '  /reset  drop continuation context', '  /exit   end the session', ''].join('\n');
}

function notFoundLine(agent) {
  return `[metis] '${agent.bin}' not found on PATH; set METIS_DRIVER_BIN_${agent.id.toUpperCase()} or install it.\n`;
}

function renderTurn(result) {
  if (!result) return '[metis] no result from runner.\n';
  if (result.timedOut) return '[metis] turn timed out.\n';
  let out = result.stdout || '';
  if (out && !out.endsWith('\n')) out += '\n';
  if (!result.ok) out += `${result.stderr || ''}[metis] agent exited with status ${result.status}\n`;
  return out || '[metis] (no output)\n';
}

function noteDialogs(agent, output, io, yolo) {
  if (yolo) return;
  for (const rule of agent.dialogRules || []) {
    if (rule.match.test(output)) {
      io.write(`[metis] ${agent.name} may be waiting for approval (${rule.label}); re-run with --yolo to auto-approve.\n`);
      return;
    }
  }
}

module.exports = { createReadlineIo, runDriverSession };
