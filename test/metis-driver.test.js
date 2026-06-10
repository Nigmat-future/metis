const assert = require('node:assert');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const { AGENTS, agentIds, buildArgs, findAgent, parseSessionRef } = require('../lib/driver/agents');
const { runDriverSession } = require('../lib/driver/session');

const metisCli = path.join(__dirname, '..', 'bin', 'metis.js');
const repoRoot = path.join(__dirname, '..');
const fakeAgent = path.join(__dirname, 'fixtures', 'fake-agents', 'echo-agent.js');

function runMetis(args, env = {}) {
  return spawnSync(process.execPath, [metisCli, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

// --- pure per-agent specs ---

test('driver covers the four requested agents', () => {
  assert.deepStrictEqual(agentIds, ['claude', 'codex', 'opencode', 'cursor']);
  assert.strictEqual(AGENTS.length, 4);
});

test('agent aliases resolve to canonical ids', () => {
  assert.strictEqual(findAgent('claude-code').id, 'claude');
  assert.strictEqual(findAgent('CC').id, 'claude');
  assert.strictEqual(findAgent('cursor-agent').id, 'cursor');
  assert.strictEqual(findAgent('nope'), null);
});

test('one-shot args carry the prompt in each agent dialect', () => {
  assert.deepStrictEqual(buildArgs(findAgent('claude'), 'oneShot', { prompt: 'hi' }).slice(0, 2), ['-p', 'hi']);
  const codex = buildArgs(findAgent('codex'), 'oneShot', { prompt: 'hi' });
  assert.strictEqual(codex[0], 'exec');
  assert.strictEqual(codex[codex.length - 1], 'hi');
  const opencode = buildArgs(findAgent('opencode'), 'oneShot', { prompt: 'hi' });
  assert.strictEqual(opencode[0], 'run');
  assert.strictEqual(opencode[opencode.length - 1], 'hi');
  assert.deepStrictEqual(buildArgs(findAgent('cursor'), 'oneShot', { prompt: 'hi' }).slice(0, 2), ['-p', 'hi']);
});

test('yolo adds the skip-confirmations flag only when requested', () => {
  assert.ok(!buildArgs(findAgent('claude'), 'oneShot', { prompt: 'x' }).includes('--dangerously-skip-permissions'));
  assert.ok(buildArgs(findAgent('claude'), 'oneShot', { prompt: 'x', yolo: true }).includes('--dangerously-skip-permissions'));
});

test('continue reuses a captured resume id', () => {
  const args = buildArgs(findAgent('claude'), 'continue', { prompt: 'again', sessionRef: 's1' });
  assert.ok(args.includes('--resume'));
  assert.ok(args.includes('s1'));
});

test('parseSessionRef reads a session id from agent JSON', () => {
  assert.strictEqual(parseSessionRef(findAgent('claude'), '{"session_id":"abc"}'), 'abc');
  assert.strictEqual(parseSessionRef(findAgent('claude'), 'no json here'), null);
});

// --- CLI: preview, validation, detection (no execution) ---

test('run --dry-run shows the resolved command for each agent', () => {
  for (const id of ['claude', 'codex', 'opencode', 'cursor']) {
    const result = runMetis(['run', id, 'hello', '--dry-run']);
    assert.strictEqual(result.status, 0, result.stderr);
    assert.match(result.stdout, /dry run/);
    assert.match(result.stdout, /Writes: none/);
    assert.match(result.stdout, /hello/);
  }
});

test('run refuses to execute without --yes or --dry-run', () => {
  const result = runMetis(['run', 'claude', 'hello']);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /preview with --dry-run/);
});

test('run rejects an unknown agent', () => {
  const result = runMetis(['run', 'bogus', 'hi', '--dry-run']);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /Unknown agent/);
});

test('driver-only flags are rejected on non-run commands', () => {
  const result = runMetis(['scan', '--yolo']);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /only valid with run/);
});

test('agents lists the four CLIs', () => {
  const result = runMetis(['agents']);
  assert.strictEqual(result.status, 0);
  for (const id of ['claude', 'codex', 'opencode', 'cursor']) assert.match(result.stdout, new RegExp(id));
});

test('agents --json emits a parseable array of four', () => {
  const result = runMetis(['agents', '--json']);
  assert.strictEqual(result.status, 0);
  assert.strictEqual(JSON.parse(result.stdout).length, 4);
});

// --- CLI: real execution against the fake agent ---

test('run --yes executes the agent and captures output', () => {
  const result = runMetis(['run', 'claude', 'hello world', '--yes'], { METIS_DRIVER_BIN_CLAUDE: `node:${fakeAgent}` });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout, /ECHO: hello world/);
});

test('run surfaces a non-zero agent exit', () => {
  const result = runMetis(['run', 'codex', 'BOOM', '--yes'], { METIS_DRIVER_BIN_CODEX: `node:${fakeAgent}` });
  assert.strictEqual(result.status, 3);
  assert.match(result.stderr, /exited with status 3/);
});

test('run --json wraps the result', () => {
  const result = runMetis(['run', 'opencode', 'hi', '--yes', '--json'], { METIS_DRIVER_BIN_OPENCODE: `node:${fakeAgent}` });
  assert.strictEqual(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.strictEqual(parsed.agent, 'opencode');
  assert.match(parsed.stdout, /ECHO: hi/);
});

test('run --interactive without a TTY explains how to launch it', () => {
  const result = runMetis(['run', 'claude', '--interactive', '--yes']);
  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /requires a TTY/);
});

// --- interactive session loop (injected io + runner) ---

function fakeIo(inputs) {
  const writes = [];
  let index = 0;
  return {
    writes,
    text: () => writes.join(''),
    write: (value) => writes.push(value),
    prompt: async () => (index < inputs.length ? inputs[index++] : null),
    close: () => {},
  };
}

test('session runs a turn then continues with the captured session id', async () => {
  const calls = [];
  const runner = (agent, mode, opts) => {
    calls.push({ mode, prompt: opts.prompt, sessionRef: opts.sessionRef });
    return { ok: true, status: 0, stdout: 'ECHO\n{"session_id":"s9"}', stderr: '', timedOut: false };
  };
  const io = fakeIo(['hello', 'again', '/exit']);
  const result = await runDriverSession({ agent: findAgent('claude'), root: repoRoot, env: {}, io, runner });
  assert.strictEqual(result.turns, 2);
  assert.strictEqual(calls[0].mode, 'oneShot');
  assert.strictEqual(calls[1].mode, 'continue');
  assert.strictEqual(calls[1].sessionRef, 's9');
  assert.match(io.text(), /Metis driver session/);
});

test('session /help does not spend a turn', async () => {
  const runner = () => ({ ok: true, status: 0, stdout: 'ok', stderr: '', timedOut: false });
  const io = fakeIo(['/help', '/exit']);
  const result = await runDriverSession({ agent: findAgent('opencode'), root: repoRoot, env: {}, io, runner });
  assert.strictEqual(result.turns, 0);
  assert.match(io.text(), /\/reset/);
});
