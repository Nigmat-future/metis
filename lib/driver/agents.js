// Per-agent driver specs: how Metis launches and continues each coding-agent CLI.
//
// This mirrors Hermes's per-agent skill files (one normalized "how to drive this
// CLI" spec per agent), but expressed as data plus small pure arg-builders so the
// behaviour is deterministic and unit-testable without the real CLIs installed.
//
// Each spec exposes:
//   bin          logical executable name (resolved against PATH at run time)
//   aliases      alternate names accepted on the command line
//   configFiles  files/dirs that signal the agent is configured in a project
//   skipFlag     the agent's "skip confirmations" flag (only used with --yolo)
//   sessionKeys  JSON keys to harvest a resumable session id from agent output
//   oneShot      args for a single non-interactive prompt
//   continueTurn args for the next turn of a multi-turn session
//   attach       args for handing the terminal to the agent's own interactive UI
//   dialogRules  patterns that hint the agent paused for an approval prompt

function valFlag(flag, value) {
  return value == null || value === '' ? [] : [flag, String(value)];
}

function boolFlag(condition, flag) {
  return condition && flag ? [flag] : [];
}

function modelArgs(flag, opts) {
  return valFlag(flag, opts.model);
}

function skipArgs(opts, flag) {
  return boolFlag(opts.yolo, flag);
}

function jsonValue(flag, value, opts) {
  return opts.json ? [flag, value] : [];
}

function withPrompt(args, opts) {
  return opts.prompt != null && opts.prompt !== '' ? [...args, String(opts.prompt)] : args;
}

const AGENTS = [
  {
    id: 'claude',
    name: 'Claude Code',
    bin: 'claude',
    aliases: ['claude-code', 'cc'],
    docUrl: 'https://docs.claude.com/en/docs/claude-code',
    configFiles: ['CLAUDE.md', '.claude/settings.json', '.claude/mcp.json'],
    skipFlag: '--dangerously-skip-permissions',
    sessionKeys: ['session_id', 'sessionId'],
    oneShot(opts) {
      return ['-p', String(opts.prompt), ...jsonValue('--output-format', 'json', opts), ...modelArgs('--model', opts), ...skipArgs(opts, this.skipFlag)];
    },
    continueTurn(opts) {
      const resume = opts.sessionRef ? ['--resume', opts.sessionRef] : ['--continue'];
      return ['-p', String(opts.prompt), ...resume, ...modelArgs('--model', opts), ...skipArgs(opts, this.skipFlag)];
    },
    attach(opts) {
      return withPrompt([...skipArgs(opts, this.skipFlag)], opts);
    },
    dialogRules: [{ match: /\bdo you want to proceed\b/i, send: '1', label: 'approve action' }],
  },
  {
    id: 'codex',
    name: 'Codex',
    bin: 'codex',
    aliases: ['openai-codex'],
    docUrl: 'https://github.com/openai/codex',
    configFiles: ['AGENTS.md', '.codex/config.toml', '.codex/config.json'],
    skipFlag: '--full-auto',
    sessionKeys: ['session_id', 'thread_id', 'conversation_id'],
    oneShot(opts) {
      return withPrompt(['exec', ...boolFlag(opts.json, '--json'), ...modelArgs('-m', opts), ...skipArgs(opts, this.skipFlag)], opts);
    },
    continueTurn(opts) {
      return withPrompt(['exec', 'resume', '--last', ...skipArgs(opts, this.skipFlag)], opts);
    },
    attach(opts) {
      return withPrompt([...skipArgs(opts, this.skipFlag)], opts);
    },
    dialogRules: [{ match: /\ballow command\b|\bapprove\b/i, send: 'y', label: 'approve command' }],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    bin: 'opencode',
    aliases: ['oc'],
    docUrl: 'https://opencode.ai/docs',
    configFiles: ['AGENTS.md', 'opencode.json', 'opencode.jsonc', '.opencode'],
    skipFlag: null,
    sessionKeys: ['sessionID', 'session_id', 'id'],
    oneShot(opts) {
      return withPrompt(['run', ...modelArgs('--model', opts)], opts);
    },
    continueTurn(opts) {
      const resume = opts.sessionRef ? ['--session', opts.sessionRef] : ['--continue'];
      return withPrompt(['run', ...resume, ...modelArgs('--model', opts)], opts);
    },
    attach() {
      return [];
    },
    dialogRules: [],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    bin: 'cursor-agent',
    aliases: ['cursor-agent'],
    docUrl: 'https://docs.cursor.com/en/cli/overview',
    configFiles: ['.cursor/rules', '.cursorrules', '.cursor/mcp.json', 'AGENTS.md'],
    skipFlag: '--force',
    sessionKeys: ['chatId', 'chat_id', 'threadId', 'sessionId'],
    oneShot(opts) {
      return ['-p', String(opts.prompt), ...jsonValue('--output-format', 'json', opts), ...modelArgs('-m', opts), ...skipArgs(opts, this.skipFlag)];
    },
    continueTurn(opts) {
      if (!opts.sessionRef) return this.oneShot(opts);
      return ['-p', String(opts.prompt), '--resume', opts.sessionRef, ...modelArgs('-m', opts), ...skipArgs(opts, this.skipFlag)];
    },
    attach(opts) {
      return withPrompt([...skipArgs(opts, this.skipFlag)], opts);
    },
    dialogRules: [],
  },
];

const agentIds = AGENTS.map((agent) => agent.id);

function findAgent(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  return AGENTS.find((agent) => agent.id === key || (agent.aliases || []).includes(key)) || null;
}

function buildArgs(agent, mode, opts) {
  if (mode === 'attach') return agent.attach(opts);
  if (mode === 'continue') return agent.continueTurn(opts);
  return agent.oneShot(opts);
}

function parseSessionRef(agent, output) {
  const text = String(output || '');
  for (const key of agent.sessionKeys || []) {
    const match = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`).exec(text);
    if (match) return match[1];
  }
  return null;
}

module.exports = { AGENTS, agentIds, buildArgs, findAgent, parseSessionRef };
