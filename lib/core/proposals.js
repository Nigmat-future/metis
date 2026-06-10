const crypto = require('node:crypto');
const fs = require('node:fs');
const { makeProposalId, METIS_PROPOSALS_DIR, MAX_PROPOSAL_BYTES } = require('./artifacts');
const {
  atomicWriteJson,
  listJsonRecords,
  proposalPathForId,
  withArtifactLock,
} = require('./artifact-store');
const { ensureInsidePath } = require('./fs-safe');

function hashEvidenceBaseline(pipeline) {
  const payload = (pipeline.evidence || []).map((item) => ({
    id: item.id,
    source: item.source,
    kind: item.kind,
    summary: item.summary,
    risks: item.risks,
  }));
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function redactCandidate(candidate) {
  return {
    title: candidate.title,
    decision: candidate.decision,
    risk: candidate.risk,
    evidenceIds: candidate.evidenceIds,
    targets: candidate.targets,
    tokenCostEstimate: candidate.tokenCostEstimate,
  };
}

function buildProposalRecord(pipeline, changes) {
  return {
    schemaVersion: 1,
    id: makeProposalId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    baselineEvidenceHash: hashEvidenceBaseline(pipeline),
    changes: changes.map(redactChange),
    audit: {
      ok: pipeline.audit.ok,
      issues: (pipeline.audit.issues || []).map((issue) => ({ severity: issue.severity, message: issue.message })),
    },
    redactionStatus: 'redacted',
  };
}

function redactChange(change) {
  return {
    kind: change.kind,
    title: change.title,
    evidenceIds: change.evidenceIds || [],
    tokenImpact: change.tokenImpact || 0,
    current: change.current ? redactCandidate(change.current) : null,
    previous: change.previous ? redactCandidate(change.previous) : null,
  };
}

function saveProposal(root, record) {
  validateProposalRecord(record);
  return withArtifactLock(root, () => {
    const relativePath = proposalPathForId(record.id);
    atomicWriteJson(root, relativePath, record);
    return { ok: true, id: record.id, path: relativePath };
  });
}

function readProposal(root, id) {
  validateProposalId(id);
  const relativePath = proposalPathForId(id);
  const absolutePath = ensureInsidePath(root, relativePath);
  const stat = fs.statSync(absolutePath);
  if (stat.size > MAX_PROPOSAL_BYTES) {
    throw new Error(`proposal file exceeds max size (${MAX_PROPOSAL_BYTES} bytes): ${id}`);
  }
  const text = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(text);
  validateProposalRecord(parsed);
  if (parsed.id !== id) throw new Error('proposal id mismatch');
  return parsed;
}

function listProposals(root) {
  const warnings = [];
  const proposals = listJsonRecords(root, METIS_PROPOSALS_DIR).map((id) => {
    try {
      const record = readProposal(root, id);
      return {
        id: record.id,
        status: record.status,
        createdAt: record.createdAt,
        changeCount: record.changes.length,
        auditOk: record.audit.ok,
      };
    } catch (error) {
      warnings.push({ id, message: error.message });
      return null;
    }
  }).filter(Boolean);
  proposals.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  return { proposals, warnings };
}

function resolveProposalId(root, id) {
  if (id !== 'latest') return id;
  const { proposals } = listProposals(root);
  if (!proposals.length) throw new Error('No saved proposals');
  return proposals[proposals.length - 1].id;
}

function updateProposalStatus(root, id, status) {
  const allowed = new Set(['pending', 'accepted', 'dismissed', 'applied']);
  if (!allowed.has(status)) throw new Error(`Invalid proposal status: ${status}`);
  return withArtifactLock(root, () => {
    const record = readProposal(root, id);
    record.status = status;
    atomicWriteJson(root, proposalPathForId(id), record);
    return record;
  });
}

function validateProposalId(id) {
  if (!id || !String(id).startsWith('metis-proposal-') || String(id).includes('/') || String(id).includes('\\')) {
    throw new Error('proposal id is invalid');
  }
}

function validateProposalRecord(record) {
  if (!record || record.schemaVersion !== 1) throw new Error('proposal record is malformed');
  if (!record.id || !record.id.startsWith('metis-proposal-')) throw new Error('proposal id is invalid');
  if (!record.createdAt || !Array.isArray(record.changes)) throw new Error('proposal record is malformed');
  if (!record.audit || typeof record.audit.ok !== 'boolean') throw new Error('proposal audit is malformed');
  if (record.redactionStatus !== 'redacted') throw new Error('proposal must be redacted before save');
}

module.exports = {
  buildProposalRecord,
  hashEvidenceBaseline,
  listProposals,
  readProposal,
  resolveProposalId,
  saveProposal,
  updateProposalStatus,
};
