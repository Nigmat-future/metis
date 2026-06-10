const fs = require('node:fs');
const path = require('node:path');
const { ensureInsidePath } = require('../core/fs-safe');
const {
  METIS_EVIDENCE_PATH,
  LEGACY_PCA_EVIDENCE_PATH,
  METIS_ROLLBACK_DIR,
  LEGACY_PCA_ROLLBACK_DIR,
} = require('../core/artifacts');
function doctorWorkflow(root, options = {}) {
  const { scanWorkflow, stableJson } = require('./index');
  const version = readPackageVersion();
  const pipeline = scanWorkflow(root, { includeHistory: options.includeHistory });
  const artifacts = inspectArtifacts(root);
  const report = {
    brand: 'Metis',
    version,
    nodeVersion: process.version,
    platform: process.platform,
    root: '.',
    evidenceCount: pipeline.evidence.length,
    auditOk: pipeline.audit.ok,
    artifacts,
    safety: {
      remoteCalls: 'disabled',
      telemetry: 'disabled',
      gui: 'read-only preview',
      tuiApply: 'requires APPLY METIS',
      history: options.includeHistory ? 'opt-in redacted snippets' : 'not read by default',
    },
    nextAction: pipeline.evidence.length ? 'metis scan' : 'metis scan (no evidence yet; try another root)',
    alternateAction: 'metis tui',
  };
  return {
    exitCode: 0,
    stdout: options.json ? `${stableJson(report)}\n` : formatDoctor(report),
    stderr: '',
  };
}

function readPackageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'));
    return pkg.version || 'unknown';
  } catch (_) {
    return 'unknown';
  }
}

function inspectArtifacts(root) {
  return {
    metisEvidence: exists(root, METIS_EVIDENCE_PATH),
    metisRollbackRecords: countFiles(root, METIS_ROLLBACK_DIR),
    legacyPcaEvidence: exists(root, LEGACY_PCA_EVIDENCE_PATH),
    legacyPcaRollbackRecords: countFiles(root, LEGACY_PCA_ROLLBACK_DIR),
    proposals: existsDir(root, '.metis/proposals'),
  };
}

function exists(root, relativePath) {
  try {
    return fs.existsSync(ensureInsidePath(root, relativePath));
  } catch (_) {
    return false;
  }
}

function existsDir(root, relativePath) {
  try {
    return fs.statSync(ensureInsidePath(root, relativePath)).isDirectory();
  } catch (_) {
    return false;
  }
}

function countFiles(root, relativeDir) {
  try {
    const dir = ensureInsidePath(root, relativeDir);
    if (!fs.existsSync(dir)) return 0;
    return fs.readdirSync(dir).filter((name) => name.endsWith('.json')).length;
  } catch (_) {
    return 0;
  }
}

function formatDoctor(report) {
  return [
    'Metis doctor',
    '',
    `Version: ${report.version}`,
    `Node: ${report.nodeVersion}`,
    `Platform: ${report.platform}`,
    'Root: .',
    '',
    'Evidence:',
    `  items found     ${report.evidenceCount}`,
    `  audit status    ${report.auditOk ? 'ok' : 'issues present'}`,
    '',
    'Artifacts:',
    `  .metis evidence           ${report.artifacts.metisEvidence ? 'present' : 'absent'}`,
    `  .metis rollback records   ${report.artifacts.metisRollbackRecords}`,
    `  legacy .pca evidence      ${report.artifacts.legacyPcaEvidence ? 'present' : 'absent'}`,
    `  legacy .pca rollback      ${report.artifacts.legacyPcaRollbackRecords}`,
    `  .metis proposals dir      ${report.artifacts.proposals ? 'present' : 'absent'}`,
    '',
    'Safety boundary:',
    `  remote calls    ${report.safety.remoteCalls}`,
    `  telemetry       ${report.safety.telemetry}`,
    `  GUI             ${report.safety.gui}`,
    `  TUI apply       ${report.safety.tuiApply}`,
    `  history         ${report.safety.history}`,
    '',
    'Recommended next step (read-only):',
    `  ${report.nextAction}`,
    `  or ${report.alternateAction}`,
    '',
    'Writes: none',
    '',
  ].join('\n');
}

module.exports = { doctorWorkflow };
