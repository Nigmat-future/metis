// Driver orchestration: resolve an agent's command, preview it (dry run), execute a
// single turn, and detect which agents are installed/configured. Spawning is kept
// behind ./spawn so this module stays deterministic and easy to test.

const { createRedactor } = require('../core/redactor');
const { safeLstat } = require('../core/fs-safe');
const { AGENTS, buildArgs, parseSessionRef } = require('./agents');
const { resolveBin, runAttached, runOnce } = require('./spawn');

// Map a logical agent to a concrete command. An override env var lets tests (and
// power users) point an agent at a specific executable, including `node:<script>`.
function resolveAgentCommand(agent, env = process.env) {
  const override = env[`METIS_DRIVER_BIN_${agent.id.toUpperCase()}`];
  if (override) {
    if (override.startsWith('node:')) {
      return { found: true, command: process.execPath, prefixArgs: [override.slice(5)], useShell: false, source: 'override' };
    }
    const resolved = resolveBin(override, env);
    return { found: resolved.found, command: resolved.command, prefixArgs: [], useShell: resolved.needsShell, source: 'override' };
  }
  const resolved = resolveBin(agent.bin, env);
  return { found: resolved.found, command: resolved.command, prefixArgs: [], useShell: resolved.needsShell, source: 'path' };
}

function planRun(agent, mode, opts, env = process.env) {
  const command = resolveAgentCommand(agent, env);
  const args = [...command.prefixArgs, ...buildArgs(agent, mode, opts)];
  const shown = [command.found ? command.command : agent.bin, ...args].map(quote).join(' ');
  return { found: command.found, command: command.command, args, display: createRedactor().redact(shown).text };
}

function executeRun(agent, mode, opts, context = {}) {
  const env = context.env || process.env;
  const command = resolveAgentCommand(agent, env);
  if (!command.found) return { notFound: true, agent: agent.id };
  const args = [...command.prefixArgs, ...buildArgs(agent, mode, opts)];
  const base = { command: command.command, args, cwd: context.cwd, useShell: command.useShell, env, spawnSyncImpl: context.spawnSyncImpl };
  const result = context.attached
    ? runAttached(base)
    : runOnce({ ...base, timeoutMs: context.timeoutMs, maxBytes: context.maxBytes, input: context.input });
  result.sessionRef = context.attached ? null : parseSessionRef(agent, result.stdout || '');
  return result;
}

function detectAgents(root, env = process.env) {
  return AGENTS.map((agent) => {
    const command = resolveAgentCommand(agent, env);
    const configs = agent.configFiles.filter((relativePath) => existsInRoot(root, relativePath));
    return {
      id: agent.id,
      name: agent.name,
      bin: agent.bin,
      installed: command.found,
      source: command.source,
      command: command.found ? createRedactor().redact(command.command).text : null,
      configs,
    };
  });
}

function resultToJson(result, agent) {
  return {
    agent: agent.id,
    ok: result.ok,
    status: result.status,
    signal: result.signal,
    timedOut: result.timedOut,
    sessionRef: result.sessionRef || null,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function formatDryRun(plan, agent, mode) {
  const lines = [
    `Metis driver: ${agent.name} (${agent.id}) - ${mode} dry run`,
    '',
    `Command: ${plan.display}`,
    'Working dir: .',
  ];
  if (!plan.found) lines.push(`Note: '${agent.bin}' not found on PATH; install it or set METIS_DRIVER_BIN_${agent.id.toUpperCase()}.`);
  lines.push('', 'Writes: none (dry run; nothing executed)', '');
  return lines.join('\n');
}

function formatAgents(list) {
  const lines = ['Supported agent CLIs:', ''];
  for (const agent of list) {
    const where = agent.installed ? `installed (${agent.command})` : 'not found on PATH';
    lines.push(`  ${agent.id.padEnd(10)} ${agent.name.padEnd(14)} ${where}`);
    lines.push(`             project config: ${agent.configs.length ? agent.configs.join(', ') : 'none detected'}`);
  }
  lines.push('', 'Preview a run with: metis run <agent> "<prompt>" --dry-run', '');
  return lines.join('\n');
}

function notFoundMessage(agent) {
  return `Agent CLI '${agent.bin}' for ${agent.name} was not found on PATH.\n`
    + `Install it, or point Metis at it with METIS_DRIVER_BIN_${agent.id.toUpperCase()}.\n`;
}

function existsInRoot(root, relativePath) {
  return safeLstat(root, relativePath).status === 'present';
}

function quote(token) {
  const value = String(token);
  return /\s|"/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

module.exports = {
  detectAgents,
  executeRun,
  formatAgents,
  formatDryRun,
  notFoundMessage,
  planRun,
  resolveAgentCommand,
  resultToJson,
};
