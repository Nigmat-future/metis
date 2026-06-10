const fs = require('node:fs');
const path = require('node:path');
const {
  METIS_LOCK_PATH,
  METIS_PROPOSALS_DIR,
  MAX_PROPOSAL_BYTES,
  proposalPathForId,
} = require('./artifacts');
const { assertWritableFilePath, ensureInsidePath, safeLstat } = require('./fs-safe');

const PROPOSAL_WRITE_PREFIXES = [METIS_PROPOSALS_DIR, METIS_LOCK_PATH];
const STALE_LOCK_MS = 5 * 60 * 1000;

function assertProposalWritePath(root, relativePath) {
  const normalized = String(relativePath).replace(/\\/g, '/');
  if (!PROPOSAL_WRITE_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    throw new Error(`Refusing non-whitelisted artifact path: ${relativePath}`);
  }
  return assertWritableFilePath(root, relativePath);
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code === 'EPERM';
  }
}

function readLock(root) {
  const relativePath = METIS_LOCK_PATH;
  const target = safeLstat(root, relativePath);
  if (target.status !== 'present' || !target.stat.isFile()) return null;
  try {
    return JSON.parse(fs.readFileSync(ensureInsidePath(root, relativePath), 'utf8'));
  } catch (_) {
    return null;
  }
}

function isStaleLock(lock) {
  if (!lock || !lock.createdAt) return true;
  const age = Date.now() - Date.parse(lock.createdAt);
  if (!Number.isFinite(age) || age > STALE_LOCK_MS) return true;
  if (lock.pid && !isProcessAlive(lock.pid)) return true;
  return false;
}

function acquireLock(root, owner = 'metis') {
  try {
    return createLock(root, owner);
  } catch (error) {
    if (!error || error.code !== 'EEXIST') throw error;
    const lock = readLock(root);
    if (!isStaleLock(lock)) {
      throw new Error('Metis artifact lock is already held; retry after the current write completes');
    }
    releaseLock(root);
    return createLock(root, owner);
  }
}

function createLock(root, owner) {
  const relativePath = METIS_LOCK_PATH;
  assertProposalWritePath(root, relativePath);
  const absolutePath = ensureInsidePath(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const fd = fs.openSync(absolutePath, 'wx');
  try {
    fs.writeFileSync(fd, `${JSON.stringify({ owner, pid: process.pid, createdAt: new Date().toISOString() })}\n`);
  } finally {
    fs.closeSync(fd);
  }
  return { ok: true, path: relativePath };
}

function releaseLock(root) {
  const relativePath = METIS_LOCK_PATH;
  const target = safeLstat(root, relativePath);
  if (target.status !== 'present' || !target.stat.isFile()) return;
  fs.rmSync(ensureInsidePath(root, relativePath), { force: true });
}

function atomicWriteJson(root, relativePath, value, maxBytes = MAX_PROPOSAL_BYTES) {
  assertProposalWritePath(root, relativePath);
  const text = `${JSON.stringify(value, null, 2)}\n`;
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    throw new Error(`Artifact exceeds max size (${maxBytes} bytes): ${relativePath}`);
  }
  const absolutePath = ensureInsidePath(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const tempPath = `${absolutePath}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, text, 'utf8');
    fs.renameSync(tempPath, absolutePath);
  } catch (error) {
    try {
      fs.rmSync(tempPath, { force: true });
    } catch (_) {
      // Ignore cleanup failure.
    }
    throw error;
  }
  return { path: relativePath, bytes: Buffer.byteLength(text, 'utf8') };
}

function withArtifactLock(root, fn) {
  acquireLock(root);
  try {
    return fn();
  } finally {
    releaseLock(root);
  }
}

function listJsonRecords(root, relativeDir) {
  const dir = ensureInsidePath(root, relativeDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .sort();
}

module.exports = {
  acquireLock,
  assertProposalWritePath,
  atomicWriteJson,
  isStaleLock,
  listJsonRecords,
  proposalPathForId,
  releaseLock,
  withArtifactLock,
};
