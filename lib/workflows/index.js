const { resolveScanRoot } = require('../core/fs-safe');
const { scanAll } = require('../adapters');
const { extractBehaviors } = require('../extractor/behavior');
const { planCandidates } = require('../planner/candidates');
const { assessRuleQuality } = require('../planner/rule-quality');
const { auditAll } = require('../auditor/safety');
const { generateScaffold } = require('../generator/scaffold');
const { applyScaffold } = require('../applier/apply');
const { rollbackScaffold } = require('../applier/rollback');
const { evolveDryRun } = require('../planner/evolve');

function resolveRootWorkflow(fixture, cwd) {
  return resolveScanRoot(fixture, cwd);
}

function buildPipeline(root, options = {}) {
  const scanned = scanAll(root, { includeHistory: options.includeHistory });
  const evidence = scanned.evidence;
  const behaviors = extractBehaviors(evidence);
  const candidates = planCandidates(behaviors);
  const ruleQuality = assessRuleQuality(candidates);
  const audit = auditAll({ evidence, candidates });
  return {
    ok: true,
    root,
    evidence,
    behaviors,
    candidates,
    ruleQuality,
    audit,
    warnings: scanned.warnings,
  };
}

function scanWorkflow(root, options = {}) {
  return buildPipeline(root, options);
}

function planWorkflow(root, options = {}) {
  return buildPipeline(root, options);
}

function initDryRunWorkflow(pipeline) {
  return generateScaffold(pipeline);
}

function applyWorkflow(root, generated) {
  return applyScaffold(root, generated.files);
}

function rollbackWorkflow(root, rollbackId) {
  return rollbackScaffold(root, rollbackId);
}

function evolveWorkflow(root, pipeline) {
  return evolveDryRun(root, pipeline);
}

function previewWorkflow(root, options = {}) {
  const pipeline = buildPipeline(root, options);
  const generated = generateScaffold(pipeline);
  return { pipeline, generated };
}

function stableJson(value) {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = sortKeys(value[key]);
    return result;
  }, {});
}

module.exports = {
  applyWorkflow,
  buildPipeline,
  evolveWorkflow,
  initDryRunWorkflow,
  planWorkflow,
  previewWorkflow,
  resolveRootWorkflow,
  rollbackWorkflow,
  scanWorkflow,
  stableJson,
};
