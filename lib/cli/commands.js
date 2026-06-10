const { parseArgs } = require('./args');
const { formatHelp, formatPlan, formatScan } = require('./output');
const {
  resolveRootWorkflow,
  scanWorkflow,
  planWorkflow,
  initDryRunWorkflow,
  applyWorkflow,
  rollbackWorkflow,
  evolveWorkflow,
  stableJson,
} = require('../workflows');
const { doctorWorkflow } = require('../workflows/doctor');
const { listAgentsWorkflow, runDriverWorkflow } = require('../workflows/driver');
const {
  acceptProposalWorkflow,
  dismissProposalWorkflow,
  inspectProposalWorkflow,
  listProposalsWorkflow,
  saveEvolveProposalWorkflow,
} = require('../workflows/proposals');
const { runTui } = require('../tui');
const { runGuiPreview } = require('../gui');
const { noteWorkflow, learnWorkflow } = require('../workflows/corrections');

function run(argv, cwd, options = {}) {
  const brand = options.brand || 'metis';
  const parsed = parseArgs(argv);
  if (!parsed.ok) return err(2, `${parsed.error}\n\n${formatHelp({ brand })}`);
  const request = parsed.value;
  if (request.command === 'help') return ok(formatHelp({ brand }));
  const rootResult = resolveRootWorkflow(request.flags.fixture, cwd);
  if (!rootResult.ok) return err(2, `${rootResult.error}\n`);
  if (request.command === 'rollback') {
    const result = rollbackWorkflow(rootResult.root, request.positionals[0]);
    return result.ok ? ok(result.stdout) : err(result.exitCode, result.stderr);
  }
  if (request.command === 'tui') return runTuiCommand(rootResult.root, request.flags);
  if (request.command === 'gui') return runGuiPreview(rootResult.root, request.flags, cwd);
  if (request.command === 'doctor') {
    const result = doctorWorkflow(rootResult.root, { includeHistory: request.flags.includeHistory, json: request.flags.json });
    return result.exitCode === 0 ? ok(result.stdout) : err(result.exitCode, result.stderr);
  }
  if (request.command === 'proposal') return proposalResponse(rootResult.root, request);
  if (request.command === 'agents') {
    const result = listAgentsWorkflow(rootResult.root, { json: request.flags.json });
    return result.exitCode === 0 ? ok(result.stdout) : err(result.exitCode, result.stderr);
  }
  if (request.command === 'run') return runResponse(rootResult.root, request);
  if (request.command === 'note') {
    const result = noteWorkflow(rootResult.root, request.positionals[0], { source: request.flags.source });
    return result.exitCode === 0 ? ok(result.stdout) : err(result.exitCode, result.stderr);
  }
  if (request.command === 'learn') {
    const result = learnWorkflow(rootResult.root, {
      source: request.flags.source,
      dryRun: request.flags.dryRun,
      yes: request.flags.yes,
      json: request.flags.json,
    });
    return result.exitCode === 0 ? ok(result.stdout) : err(result.exitCode, result.stderr);
  }
  const pipeline = scanWorkflow(rootResult.root, { includeHistory: request.flags.includeHistory });
  if (request.command === 'scan') return scanResponse(pipeline, request.flags);
  if (request.command === 'plan') return planResponse(pipeline, request.flags);
  if (request.command === 'init') return initResponse(pipeline, request.flags);
  if (request.command === 'evolve') {
    if (request.flags.saveProposal) {
      const result = saveEvolveProposalWorkflow(rootResult.root, pipeline);
      return result.exitCode === 0 ? ok(result.stdout) : err(result.exitCode, result.stderr);
    }
    const result = evolveWorkflow(rootResult.root, pipeline);
    return result.exitCode === 0 ? ok(result.stdout) : err(result.exitCode, result.stderr);
  }
  return err(2, `Unknown command: ${request.command}\n`);
}

function proposalResponse(root, request) {
  const sub = request.positionals[0] || 'list';
  const id = request.positionals[1];
  if (sub === 'list') {
    const result = listProposalsWorkflow(root, { json: request.flags.json });
    return result.exitCode === 0 ? ok(result.stdout) : err(result.exitCode, result.stderr);
  }
  if (sub === 'inspect') {
    const result = inspectProposalWorkflow(root, id, { json: request.flags.json });
    return result.exitCode === 0 ? ok(result.stdout) : err(result.exitCode, result.stderr);
  }
  if (sub === 'dismiss') {
    const result = dismissProposalWorkflow(root, id);
    return result.exitCode === 0 ? ok(result.stdout) : err(result.exitCode, result.stderr);
  }
  const result = acceptProposalWorkflow(root, id, {
    dryRun: request.flags.dryRun,
    apply: request.flags.apply,
    yes: request.flags.yes,
  });
  return result.exitCode === 0 ? ok(result.stdout) : err(result.exitCode, result.stderr);
}

function runResponse(root, request) {
  const result = runDriverWorkflow(root, request);
  if (result.interactive) {
    return err(2, 'Interactive driver session requires a TTY. Launch with: metis run <agent> --interactive --yes\n');
  }
  return { exitCode: result.exitCode, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function runTuiCommand(root, flags) {
  const tuiResult = runTui(root, flags);
  if (tuiResult.interactive) return err(2, 'Launch interactive TUI with: node bin/metis.js tui [--fixture <path>]\n');
  return { exitCode: tuiResult.exitCode, stdout: tuiResult.stdout || '', stderr: tuiResult.stderr || '' };
}

function scanResponse(pipeline, flags) {
  if (flags.json) return ok(`${stableJson({ evidence: pipeline.evidence, audit: pipeline.audit })}\n`);
  return ok(formatScan(pipeline));
}

function planResponse(pipeline, flags) {
  if (flags.json) return ok(`${stableJson({ evidence: pipeline.evidence, candidates: pipeline.candidates, audit: pipeline.audit })}\n`);
  return ok(formatPlan(pipeline));
}

function initResponse(pipeline, flags) {
  const generated = initDryRunWorkflow(pipeline);
  if (!generated.ok) return err(1, generated.message);
  if (flags.dryRun) return ok(generated.diffText);
  const applied = applyWorkflow(pipeline.root, generated);
  if (!applied.ok) return err(applied.exitCode, applied.stderr);
  return ok(applied.stdout);
}

function ok(stdout) {
  return { exitCode: 0, stdout, stderr: '' };
}

function err(exitCode, stderr) {
  return { exitCode, stdout: '', stderr };
}

module.exports = { run };
