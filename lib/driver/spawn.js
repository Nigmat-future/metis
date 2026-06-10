// Local subprocess layer for the driver. Wraps node:child_process.spawnSync so the
// rest of the driver stays pure and testable: callers can inject spawnSyncImpl.
//
// Metis never reaches the network; this only launches local executables the user
// already has installed, and only when an outer command was confirmed with --yes.

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_MAX_BYTES = 16 * 1024 * 1024;

// Resolve a bare command name against PATH (honouring PATHEXT on Windows so npm
// shims like `claude.cmd` are found). Returns the absolute path plus whether it is
// a shell script that must be launched through a shell.
function resolveBin(name, env = process.env) {
  if (path.isAbsolute(name) || name.includes('/') || name.includes('\\')) {
    return existsFile(name)
      ? { found: true, command: name, needsShell: isShellScript(name) }
      : { found: false, command: name, needsShell: false };
  }
  const pathVar = env.PATH || env.Path || '';
  const dirs = pathVar.split(path.delimiter).filter(Boolean);
  const exts = process.platform === 'win32'
    ? (env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : [''];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, `${name}${ext}`);
      if (existsFile(candidate)) return { found: true, command: candidate, needsShell: isShellScript(candidate) };
    }
  }
  return { found: false, command: name, needsShell: false };
}

function runOnce(opts) {
  const impl = opts.spawnSyncImpl || require('node:child_process').spawnSync;
  const result = impl(opts.command, opts.args || [], {
    cwd: opts.cwd,
    input: opts.input,
    timeout: opts.timeoutMs || 0,
    maxBuffer: opts.maxBytes || DEFAULT_MAX_BYTES,
    encoding: 'utf8',
    shell: Boolean(opts.useShell),
    windowsHide: true,
    env: opts.env || process.env,
  });
  return normalize(result, opts.timeoutMs);
}

function runAttached(opts) {
  const impl = opts.spawnSyncImpl || require('node:child_process').spawnSync;
  const result = impl(opts.command, opts.args || [], {
    cwd: opts.cwd,
    stdio: 'inherit',
    shell: Boolean(opts.useShell),
    windowsHide: false,
    env: opts.env || process.env,
  });
  const normalized = normalize(result, 0);
  normalized.stdout = '';
  return normalized;
}

function normalize(result, timeoutMs) {
  const timedOut = Boolean(result.error && result.error.code === 'ETIMEDOUT')
    || (Boolean(timeoutMs) && result.signal === 'SIGTERM');
  return {
    ok: !result.error && result.status === 0,
    status: result.status == null ? (result.error ? 1 : 0) : result.status,
    signal: result.signal || null,
    stdout: result.stdout || '',
    stderr: result.stderr || (result.error ? `${result.error.message}\n` : ''),
    timedOut,
    error: result.error ? result.error.message : null,
  };
}

function isShellScript(target) {
  return /\.(cmd|bat)$/i.test(target);
}

function existsFile(target) {
  try {
    return fs.statSync(target).isFile();
  } catch (_) {
    return false;
  }
}

module.exports = { DEFAULT_MAX_BYTES, resolveBin, runAttached, runOnce };
