const fs = require('node:fs');
const { assertWritableFilePath, ensureInsidePath, safeRemoveFile, safeWriteTextFile } = require('../core/fs-safe');
const { WRITABLE_PATHS } = require('./apply');
const {
  cleanupDirs,
  LEGACY_PCA_EVIDENCE_PATH,
  LEGACY_PCA_ROLLBACK_DIR,
  rollbackPathForId,
} = require('../core/artifacts');

const ROLLBACK_COMPATIBLE_PATHS = new Set([...WRITABLE_PATHS, LEGACY_PCA_EVIDENCE_PATH]);

function rollbackScaffold(root, rollbackId) {
  try {
    validateId(rollbackId);
    const rollbackPath = resolveRollbackPath(root, rollbackId);
    const absoluteRollbackPath = assertWritableFilePath(root, rollbackPath);
    const record = JSON.parse(fs.readFileSync(absoluteRollbackPath, 'utf8'));
    const plan = validateRecord(root, record, rollbackId, rollbackPath);
    for (const item of plan.operations) restorePath(root, item);
    safeRemoveFile(root, rollbackPath);
    cleanupEmptyDirs(root);
    return {
      ok: true,
      exitCode: 0,
      stdout: `Rollback ${rollbackId} complete.\n`,
      stderr: '',
    };
  } catch (error) {
    if (error.repairRoot && error.repairPath && error.repairText) {
      safeWriteTextFile(error.repairRoot, error.repairPath, error.repairText);
    }
    const exitCode = error.name === 'UsageError' ? 2 : 1;
    return { ok: false, exitCode, message: error.message, stdout: '', stderr: `${error.message}\n` };
  }
}

function resolveRollbackPath(root, rollbackId) {
  const candidates = [rollbackPathForId(rollbackId)];
  if (rollbackId.startsWith('metis-')) {
    candidates.push(`${LEGACY_PCA_ROLLBACK_DIR}/${rollbackId.replace(/^metis-/, 'pca-')}.json`);
  }
  if (!rollbackId.startsWith('pca-') && !rollbackId.startsWith('metis-')) {
    candidates.push(`${LEGACY_PCA_ROLLBACK_DIR}/${rollbackId}.json`);
  }
  for (const relativePath of candidates) {
    if (fs.existsSync(ensureInsidePath(root, relativePath))) return relativePath;
  }
  return candidates[0];
}

function validateId(id) {
  if (!id) usage('rollback id is required');
  if (id.includes('/') || id.includes('\\') || id.includes('..')) usage('rollback id is invalid');
}

function validateRecord(root, record, rollbackId, rollbackPath) {
  if (!record || record.schemaVersion !== 1 || record.id !== rollbackId || !record.cleanup || record.cleanup.rollbackPath !== rollbackPath) {
    throw new Error('rollback record is malformed');
  }
  const backupPaths = Array.isArray(record.backup && record.backup.paths) ? record.backup.paths : null;
  const paths = validatePaths(root, record.paths);
  if (paths.ok) return { operations: paths.operations };
  if (backupPaths) {
    const backup = validatePaths(root, backupPaths);
    if (backup.ok) throw repairableMalformedRecord(root, rollbackPath, record, backupPaths, paths.error);
    throw backup.error;
  }
  throw paths.error;
}

function validatePaths(root, items) {
  if (!Array.isArray(items)) return { error: new Error('rollback record is malformed'), ok: false };
  const operations = [];
  const seen = new Set();
  for (const item of items) {
    if (!item || typeof item.path !== 'string' || !ROLLBACK_COMPATIBLE_PATHS.has(item.path) || typeof item.existed !== 'boolean') {
      return { error: new Error('rollback record contains an invalid path'), ok: false };
    }
    if (seen.has(item.path)) return { error: new Error('rollback record contains a duplicate path'), ok: false };
    seen.add(item.path);
    if (item.existed && typeof item.content !== 'string') {
      return { error: new Error('rollback record contains invalid content'), ok: false };
    }
    if (!item.existed && item.content !== '' && typeof item.content !== 'string') {
      return { error: new Error('rollback record contains invalid content'), ok: false };
    }
    assertWritableFilePath(root, item.path);
    operations.push({ content: item.content || '', existed: item.existed, path: item.path });
  }
  return { ok: true, operations };
}

function restorePath(root, item) {
  if (item.existed) {
    safeWriteTextFile(root, item.path, item.content);
  } else {
    safeRemoveFile(root, item.path);
  }
}

function cleanupEmptyDirs(root) {
  for (const relativePath of cleanupDirs()) {
    const absolutePath = ensureInsidePath(root, relativePath);
    try {
      fs.rmdirSync(absolutePath);
    } catch (_) {
      // Directory either does not exist or still contains user-owned content.
    }
  }
}

function usage(message) {
  const error = new Error(message);
  error.name = 'UsageError';
  throw error;
}

function repairableMalformedRecord(root, rollbackPath, record, backupPaths, cause) {
  const error = cause || new Error('rollback record contains an invalid path');
  error.repairRoot = root;
  error.repairPath = rollbackPath;
  error.repairText = `${JSON.stringify({
    schemaVersion: record.schemaVersion,
    id: record.id,
    paths: backupPaths.map((item) => ({ path: item.path, existed: item.existed, content: item.content })),
    backup: { paths: clonePaths(backupPaths) },
    cleanup: record.cleanup,
  }, null, 2)}\n`;
  return error;
}

function clonePaths(paths) {
  return paths.map((item) => ({ content: item.content, existed: item.existed, path: item.path }));
}

module.exports = { rollbackScaffold };
