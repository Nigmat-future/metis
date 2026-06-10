const METIS_MARKER_BEGIN = '<!-- METIS:BEGIN -->';
const METIS_MARKER_END = '<!-- METIS:END -->';
const LEGACY_PCA_MARKER_BEGIN = '<!-- PCA:BEGIN -->';
const LEGACY_PCA_MARKER_END = '<!-- PCA:END -->';

const METIS_EVIDENCE_PATH = '.metis/evidence/index.json';
const METIS_ROLLBACK_DIR = '.metis/rollback';
const METIS_PROPOSALS_DIR = '.metis/proposals';
const METIS_CORRECTIONS_DIR = '.metis/corrections';
const METIS_CORRECTIONS_LOG_PATH = '.metis/corrections/log.jsonl';
const MAX_CORRECTIONS_LOG_BYTES = 512 * 1024;
const METIS_LOCK_PATH = '.metis/.lock';
const MAX_PROPOSAL_BYTES = 256 * 1024;
const LEGACY_PCA_EVIDENCE_PATH = '.pca/evidence/index.json';
const LEGACY_PCA_ROLLBACK_DIR = '.pca/rollback';

const SCAFFOLD_TARGETS = [
  'CLAUDE.md',
  'AGENTS.md',
  '.cursor/rules/personal-agent.mdc',
  METIS_EVIDENCE_PATH,
];

const idSequences = new Map();

function makeTimestampId(prefix) {
  const now = Date.now();
  const previous = idSequences.get(prefix) || { timestamp: 0, sequence: 0 };
  const sequence = previous.timestamp === now ? previous.sequence + 1 : 0;
  idSequences.set(prefix, { timestamp: now, sequence });
  const suffix = sequence ? `-${sequence.toString(36)}` : '';
  return `${prefix}-${now.toString(36)}${suffix}`;
}

function makeRollbackId() {
  return makeTimestampId('metis');
}

function makeProposalId() {
  return makeTimestampId('metis-proposal');
}

function proposalPathForId(id) {
  return `${METIS_PROPOSALS_DIR}/${id}.json`;
}

function rollbackPathForId(id) {
  if (id.startsWith('metis-')) return `${METIS_ROLLBACK_DIR}/${id}.json`;
  if (id.startsWith('pca-')) return `${LEGACY_PCA_ROLLBACK_DIR}/${id}.json`;
  return `${METIS_ROLLBACK_DIR}/${id}.json`;
}

function evidenceIndexPaths() {
  return [METIS_EVIDENCE_PATH, LEGACY_PCA_EVIDENCE_PATH];
}

function cleanupDirs() {
  return [
    '.cursor/rules',
    '.cursor',
    '.metis/evidence',
    '.metis/rollback',
    '.metis/proposals',
    '.metis',
    '.pca/evidence',
    '.pca/rollback',
    '.pca',
  ];
}

module.exports = {
  METIS_MARKER_BEGIN,
  METIS_MARKER_END,
  LEGACY_PCA_MARKER_BEGIN,
  LEGACY_PCA_MARKER_END,
  METIS_EVIDENCE_PATH,
  METIS_ROLLBACK_DIR,
  METIS_PROPOSALS_DIR,
  METIS_CORRECTIONS_DIR,
  METIS_CORRECTIONS_LOG_PATH,
  MAX_CORRECTIONS_LOG_BYTES,
  METIS_LOCK_PATH,
  MAX_PROPOSAL_BYTES,
  LEGACY_PCA_EVIDENCE_PATH,
  LEGACY_PCA_ROLLBACK_DIR,
  SCAFFOLD_TARGETS,
  cleanupDirs,
  evidenceIndexPaths,
  makeProposalId,
  makeRollbackId,
  proposalPathForId,
  rollbackPathForId,
};
