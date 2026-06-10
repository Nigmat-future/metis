// Clusters raw correction records by intent and counts how often each recurs.
// Frequency is the new signal the static scanner never had: a correction seen
// once is noise, one seen many times is a rule worth proposing.
//
// Clustering is deterministic and dependency-free: exact fingerprint buckets
// first, then a token-overlap merge so one-word edits of the same intent join
// the same cluster.

const MERGE_SIMILARITY = 0.7;

function clusterCorrections(records) {
  const list = Array.isArray(records) ? records.filter((r) => r && r.fingerprint) : [];
  if (!list.length) return [];

  const buckets = [];
  for (const record of [...list].sort((a, b) => a.id.localeCompare(b.id))) {
    const tokens = tokenize(record.fingerprint);
    const match = buckets.find((bucket) => similarity(bucket.tokens, tokens) >= MERGE_SIMILARITY);
    if (match) {
      match.records.push(record);
    } else {
      buckets.push({ tokens, records: [record] });
    }
  }

  return buckets
    .map(toCluster)
    .sort((a, b) => b.frequency - a.frequency || a.representative.localeCompare(b.representative));
}

function toCluster(bucket) {
  const records = bucket.records;
  const representative = pickRepresentative(records);
  return {
    representative: representative.fingerprint,
    type: dominantType(records),
    frequency: records.length,
    correctionIds: records.map((r) => r.id).sort(),
    sources: [...new Set(records.map((r) => r.source))].sort(),
    exampleText: representative.text,
  };
}

// The most recurrent exact fingerprint wins; ties break on id for determinism.
function pickRepresentative(records) {
  const counts = new Map();
  for (const record of records) counts.set(record.fingerprint, (counts.get(record.fingerprint) || 0) + 1);
  return [...records].sort((a, b) => {
    const diff = counts.get(b.fingerprint) - counts.get(a.fingerprint);
    return diff || a.id.localeCompare(b.id);
  })[0];
}

function dominantType(records) {
  const counts = new Map();
  for (const record of records) counts.set(record.type, (counts.get(record.type) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
}

function tokenize(fingerprint) {
  return new Set(String(fingerprint).split(/\s+/).filter(Boolean));
}

// Jaccard overlap of token sets — symmetric, stable, no external deps.
function similarity(a, b) {
  if (!a.size && !b.size) return 1;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Bridge clustered corrections into the same behavior shape the static
// extractor produces, so they flow through the existing planner/auditor/applier
// pipeline unchanged. `evidenceByFingerprint` maps a cluster's representative to
// the evidence id the corrections adapter emitted for it.
function correctionsToBehaviors(clusters, evidenceByFingerprint = new Map()) {
  return clusters.map((cluster) => {
    const evidence = evidenceByFingerprint.get(cluster.representative) || {};
    return {
      type: `correction-${cluster.type}`,
      title: behaviorTitle(cluster),
      body: behaviorBody(cluster),
      baseScore: baseScoreFor(cluster),
      frequency: cluster.frequency,
      evidenceIds: evidence.id ? [evidence.id] : [],
      targets: evidence.targets || ['CLAUDE.md', 'AGENTS.md'],
      risks: evidence.risks || [],
      redactions: evidence.redactions || [],
      contradictions: [],
    };
  });
}

function behaviorTitle(cluster) {
  const text = cluster.exampleText || cluster.representative;
  const trimmed = text.length > 60 ? `${text.slice(0, 57)}...` : text;
  return `Repeated correction: ${trimmed}`;
}

function behaviorBody(cluster) {
  const seen = cluster.frequency === 1 ? 'once' : `${cluster.frequency} times`;
  return `You corrected this ${seen}. ${cluster.exampleText || cluster.representative}.`;
}

// Frequency is the confidence: one occurrence stays low (document-only), and
// repeated corrections climb toward the generate threshold.
function baseScoreFor(cluster) {
  if (cluster.frequency >= 4) return 0.85;
  if (cluster.frequency === 3) return 0.72;
  if (cluster.frequency === 2) return 0.58;
  return 0.4;
}

module.exports = { clusterCorrections, correctionsToBehaviors };
