const { assertWritableFilePath, readExistingText, safeWriteTextFile } = require('../core/fs-safe');
const { SCAFFOLD_TARGETS, makeRollbackId, rollbackPathForId } = require('../core/artifacts');

const WRITABLE_PATHS = new Set(SCAFFOLD_TARGETS);

function applyScaffold(root, scaffold) {
  let rollbackId = null;
  let rollbackPath = null;
  let rollbackWritten = false;
  try {
    const files = Array.isArray(scaffold) ? scaffold : scaffold.files;
    validateFiles(files);
    rollbackId = makeRollbackId();
    rollbackPath = rollbackPathForId(rollbackId);
    validateWritablePaths(root, [...files.map((file) => file.path), rollbackPath]);
    const rollback = buildRollback(root, rollbackId, files, rollbackPath);
    safeWriteTextFile(root, rollbackPath, `${JSON.stringify(rollback, null, 2)}\n`);
    rollbackWritten = true;
    for (const file of files) safeWriteTextFile(root, file.path, file.content);
    return {
      ok: true,
      exitCode: 0,
      rollbackId,
      stdout: [
        'Applied Metis scaffold.',
        `Rollback ID: ${rollbackId}`,
        `Rollback record: ${rollbackPath}`,
        '',
      ].join('\n'),
      stderr: '',
    };
  } catch (error) {
    const rollback = rollbackWritten ? { rollbackId, rollbackPath } : {};
    return {
      ok: false,
      exitCode: 1,
      ...rollback,
      message: error.message,
      stdout: '',
      stderr: formatApplyError(error.message, rollback),
    };
  }
}

function validateFiles(files) {
  for (const file of files) {
    if (!WRITABLE_PATHS.has(file.path)) throw new Error(`Refusing non-whitelisted path: ${file.path}`);
    if (typeof file.content !== 'string') throw new Error(`Refusing non-text content for path: ${file.path}`);
  }
}

function validateWritablePaths(root, paths) {
  for (const relativePath of paths) assertWritableFilePath(root, relativePath);
}

function buildRollback(root, rollbackId, files, rollbackPath) {
  const paths = files.map((file) => {
    const previous = readExistingText(root, file.path);
    return {
      path: file.path,
      existed: previous.exists && !previous.blocked,
      content: previous.exists && !previous.blocked ? previous.content : '',
    };
  });
  return {
    schemaVersion: 1,
    id: rollbackId,
    paths,
    backup: { paths: clonePaths(paths) },
    cleanup: { rollbackPath },
  };
}

function clonePaths(paths) {
  return paths.map((item) => ({ content: item.content, existed: item.existed, path: item.path }));
}

function formatApplyError(message, rollback) {
  const lines = [message];
  if (rollback.rollbackId) {
    lines.push(
      `Rollback ID: ${rollback.rollbackId}`,
      `Rollback record: ${rollback.rollbackPath}`,
      'Rollback is available for any partial writes.',
    );
  }
  lines.push('');
  return lines.join('\n');
}

module.exports = { WRITABLE_PATHS, applyScaffold };
