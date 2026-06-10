const fs = require('node:fs');
const path = require('node:path');
const { sanitizeDisplayText, sanitizeJsonKey } = require('./display');

const DEFAULT_MAX_BYTES = 64 * 1024;

function resolveScanRoot(inputPath, cwd) {
  const original = inputPath || '.';
  const candidate = path.resolve(cwd, original);
  let stat;
  try {
    stat = fs.lstatSync(candidate);
  } catch (_) {
    return failure(`Scan root does not exist: ${sanitizeDisplayText(original, 160)}`);
  }
  if (stat.isSymbolicLink()) return failure('Scan root cannot be a symlink');
  if (!stat.isDirectory()) return failure('Scan root must be a directory');
  try {
    const root = fs.realpathSync(candidate);
    return { displayPath: '.', ok: true, path: root, root };
  } catch (_) {
    return failure('Scan root is inaccessible');
  }
}

function ensureInsidePath(root, relativePath) {
  const resolved = resolveInside(root, relativePath);
  if (!resolved.ok) throw new Error(`Path escapes scan root: ${relativePath}`);
  return resolved.target;
}

function resolveInside(root, relativePath) {
  const base = path.resolve(root);
  const target = path.resolve(base, relativePath);
  if (!isInsideRoot(base, target)) return { ok: false, status: 'outside-root', target };
  const segments = path.relative(base, target).split(path.sep).filter(Boolean);
  let resolvedTarget = base;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const candidate = path.join(resolvedTarget, segment);
    const isFinal = index === segments.length - 1;
    let stat;
    try {
      stat = fs.lstatSync(candidate);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return { ok: true, target: path.join(resolvedTarget, ...segments.slice(index)) };
      }
      return { ok: false, status: 'inaccessible', target: candidate };
    }

    if (stat.isSymbolicLink()) {
      let realCandidate;
      try {
        realCandidate = fs.realpathSync(candidate);
      } catch (_) {
        return { ok: false, status: 'inaccessible', target: candidate };
      }
      if (!isInsideRoot(base, realCandidate)) {
        return { ok: false, status: 'outside-root', target: realCandidate };
      }
      if (isFinal) return { ok: false, absolutePath: candidate, stat, status: 'symlink-skipped' };
      resolvedTarget = realCandidate;
      continue;
    }

    resolvedTarget = candidate;
  }

  return { ok: true, target: resolvedTarget };
}

function safeLstat(root, relativePath) {
  const resolved = resolveInside(root, relativePath);
  if (!resolved.ok) return { status: resolved.status };
  try {
    const stat = fs.lstatSync(resolved.target);
    if (stat.isSymbolicLink()) return { absolutePath: resolved.target, stat, status: 'symlink-skipped' };
    return { absolutePath: resolved.target, stat, status: 'present' };
  } catch (error) {
    if (error && error.code === 'ENOENT') return { absolutePath: resolved.target, status: 'missing' };
    return { absolutePath: resolved.target, status: 'inaccessible' };
  }
}

function safeReadTextFile(root, relativePath, maxBytes = DEFAULT_MAX_BYTES) {
  const item = safeLstat(root, relativePath);
  if (item.status !== 'present') return { status: item.status, text: '' };
  if (!item.stat.isFile()) return { status: 'not-file', text: '' };
  if (item.stat.size > maxBytes) return { size: item.stat.size, status: 'too-large', text: '' };
  try {
    return { size: item.stat.size, status: 'present', text: fs.readFileSync(item.absolutePath, 'utf8') };
  } catch (_) {
    return { status: 'inaccessible', text: '' };
  }
}

function safeReadJsonShape(root, relativePath, maxBytes = DEFAULT_MAX_BYTES) {
  const read = safeReadTextFile(root, relativePath, maxBytes);
  if (read.status !== 'present') return { hasMcpShape: false, keys: [], status: read.status };
  try {
    const value = JSON.parse(read.text);
    const keys = value && typeof value === 'object' && !Array.isArray(value)
      ? Object.keys(value).map(sanitizeJsonKey)
      : [];
    return { hasMcpShape: objectHasMcpShape(value), keys, size: read.size, status: 'present', value };
  } catch (_) {
    return { hasMcpShape: false, keys: [], status: 'parse-failed' };
  }
}

function safeListFiles(root, relativePath, options = {}) {
  const maxDepth = typeof options === 'number' ? options : options.maxDepth ?? 5;
  const skipDirs = new Set(typeof options === 'object' ? options.skipDirs || [] : []);
  const base = safeLstat(root, relativePath);
  if (base.status !== 'present') return { files: [], skipped: 0, skippedSymlinks: 0, status: base.status };
  if (!base.stat.isDirectory()) return { files: [], skipped: 0, skippedSymlinks: 0, status: 'not-directory' };
  const files = [];
  let skippedSymlinks = 0;
  walk(relativePath, 0);
  files.sort();
  return { files, skipped: skippedSymlinks, skippedSymlinks, status: 'present' };

  function walk(currentRelative, depth) {
    if (depth > maxDepth) return;
    const absolute = ensureInsidePath(root, currentRelative);
    let entries;
    try {
      entries = fs.readdirSync(absolute, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      const child = path.join(currentRelative, entry.name);
      if (entry.isSymbolicLink()) skippedSymlinks += 1;
      else if (entry.isFile()) files.push(child.replace(/\\/g, '/').replace(/^\.\//, ''));
      else if (entry.isDirectory() && !skipDirs.has(entry.name)) walk(child, depth + 1);
    }
  }
}

function readExistingText(root, relativePath) {
  const item = safeLstat(root, relativePath);
  if (item.status === 'symlink-skipped' || item.status === 'outside-root') {
    return { blocked: true, content: '', exists: false };
  }
  if (item.status !== 'present' || !item.stat.isFile()) return { blocked: false, content: '', exists: false };
  try {
    return { blocked: false, content: fs.readFileSync(item.absolutePath, 'utf8'), exists: true };
  } catch (_) {
    return { blocked: true, content: '', exists: false };
  }
}

function assertWritableFilePath(root, relativePath) {
  const absolutePath = ensureInsidePath(root, relativePath);
  assertNoSymlinkParents(root, relativePath);
  const target = safeLstat(root, relativePath);
  if (target.status === 'symlink-skipped') throw new Error(`Refusing symlink target: ${relativePath}`);
  if (target.status === 'present') {
    assertRealpathInside(root, target.absolutePath, relativePath);
    if (!target.stat.isFile()) throw new Error(`Refusing non-file target: ${relativePath}`);
  }
  return absolutePath;
}

function safeWriteTextFile(root, relativePath, content) {
  const absolutePath = assertWritableFilePath(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  assertNoSymlinkParents(root, relativePath);
  const target = safeLstat(root, relativePath);
  if (target.status === 'symlink-skipped') throw new Error(`Refusing symlink target: ${relativePath}`);
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function safeRemoveFile(root, relativePath) {
  const absolutePath = assertWritableFilePath(root, relativePath);
  fs.rmSync(absolutePath, { force: true });
}

function assertNoSymlinkParents(root, relativePath) {
  const base = path.resolve(root);
  const parts = normalizeRelativeParts(relativePath);
  let current = base;
  assertRealpathInside(root, current, '.');
  for (const part of parts.slice(0, -1)) {
    current = path.join(current, part);
    let stat;
    try {
      stat = fs.lstatSync(current);
    } catch (error) {
      if (error && error.code === 'ENOENT') continue;
      throw new Error(`Path parent is inaccessible: ${relativePath}`);
    }
    if (stat.isSymbolicLink()) throw new Error(`Refusing symlink or junction parent: ${relativePath}`);
    if (!stat.isDirectory()) throw new Error(`Path parent is not a directory: ${relativePath}`);
    assertRealpathInside(root, current, relativePath);
  }
}

function assertRealpathInside(root, absolutePath, label) {
  let realRoot;
  let realTarget;
  try {
    realRoot = fs.realpathSync(root);
    realTarget = fs.realpathSync(absolutePath);
  } catch (_) {
    return;
  }
  const resolved = resolveInside(realRoot, path.relative(realRoot, realTarget));
  if (!resolved.ok) throw new Error(`Path escapes scan root: ${label}`);
}

function normalizeRelativeParts(relativePath) {
  const value = String(relativePath || '');
  if (!value || path.isAbsolute(value)) throw new Error(`Path escapes scan root: ${relativePath}`);
  return value.split(/[\\/]+/).filter((part) => part && part !== '.');
}

function objectHasMcpShape(value) {
  if (!value || typeof value !== 'object') return false;
  return Boolean(value.mcpServers || value.mcp || value.servers || value.mcp_servers);
}

function failure(message) {
  return { error: message, message, ok: false };
}

function isInsideRoot(base, target) {
  return target === base || target.startsWith(`${base}${path.sep}`);
}

module.exports = {
  DEFAULT_MAX_BYTES,
  assertNoSymlinkParents,
  assertWritableFilePath,
  ensureInsidePath,
  readExistingText,
  resolveInside,
  resolveScanRoot,
  safeListFiles,
  safeLstat,
  safeRemoveFile,
  safeReadJsonShape,
  safeReadTextFile,
  safeWriteTextFile,
};
