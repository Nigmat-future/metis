// Corrections adapter: reads the append-only corrections log, clusters records
// by intent, and emits one evidence record per cluster. Frequency rides along
// in details so the planner can weight repeated corrections higher.
//
// Like every adapter, this never prints, never executes, and never reads
// outside the scan root. The log is already redacted at write time; evidence
// normalization redacts again as defense in depth.

const { readCorrections } = require('../core/corrections-store');
const { clusterCorrections } = require('../extractor/corrections');

function scan(context) {
  const records = readCorrections(context.root);
  if (!records.length) return;
  const clusters = clusterCorrections(records);
  for (const cluster of clusters) {
    context.builder.addEvidence({
      source: 'corrections',
      adapter: 'corrections',
      kind: 'correction',
      rootRelativePath: '.metis/corrections/log.jsonl',
      status: 'present',
      summary: summarize(cluster),
      excerpt: cluster.exampleText || cluster.representative,
      confidence: confidenceFor(cluster.frequency),
      sensitivity: 'metadata',
      signals: ['correction', `correction-${cluster.type}`],
      risks: [],
      targets: ['CLAUDE.md', 'AGENTS.md'],
      details: {
        fingerprint: cluster.representative,
        frequency: cluster.frequency,
        type: cluster.type,
        sources: cluster.sources,
      },
    });
  }
}

function summarize(cluster) {
  const seen = cluster.frequency === 1 ? 'seen once' : `seen ${cluster.frequency} times`;
  return `${cluster.type} correction (${seen}): ${cluster.exampleText || cluster.representative}`;
}

function confidenceFor(frequency) {
  if (frequency >= 4) return 0.85;
  if (frequency === 3) return 0.72;
  if (frequency === 2) return 0.58;
  return 0.4;
}

module.exports = { id: 'corrections', name: 'Corrections', scan };
