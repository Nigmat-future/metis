// Workflow layer for the agent driver. Returns the same { exitCode, stdout, stderr }
// contract the CLI uses, and exposes an async entrypoint for interactive sessions.

const driver = require('../driver');
const { AGENTS, findAgent } = require('../driver/agents');
const { createReadlineIo, runDriverSession } = require('../driver/session');
const { stableJson } = require('./index');

const DEFAULT_TIMEOUT_MS = 600000;

function listAgentsWorkflow(root, options = {}) {
  const env = options.env || process.env;
  const list = driver.detectAgents(root, env);
  const stdout = options.json ? `${stableJson(list)}\n` : driver.formatAgents(list);
  return { exitCode: 0, stdout, stderr: '' };
}

function runDriverWorkflow(root, request, deps = {}) {
  const env = deps.env || process.env;
  const flags = request.flags;
  const agent = findAgent(request.positionals[0]);
  if (!agent) return fail(2, `Unknown agent: ${request.positionals[0] || '(none)'}. Known agents: ${AGENTS.map((item) => item.id).join(', ')}`);
  if (flags.interactive) return { exitCode: 0, stdout: '', stderr: '', interactive: true, agentId: agent.id };

  const mode = flags.attach ? 'attach' : 'oneShot';
  const prompt = request.positionals[1];
  if (mode === 'oneShot' && !prompt) return fail(2, 'run <agent> "<prompt>" requires a prompt (or use --attach / --interactive)');

  const opts = { prompt, model: flags.model, json: flags.json, yolo: flags.yolo };
  if (flags.dryRun) {
    const plan = driver.planRun(agent, mode, opts, env);
    return { exitCode: 0, stdout: driver.formatDryRun(plan, agent, mode), stderr: '' };
  }

  const result = driver.executeRun(agent, mode, opts, {
    env,
    cwd: root,
    attached: flags.attach,
    timeoutMs: flags.timeout ? Number(flags.timeout) : DEFAULT_TIMEOUT_MS,
    spawnSyncImpl: deps.spawnSyncImpl,
  });
  if (result.notFound) return fail(127, driver.notFoundMessage(agent));
  return formatResult(result, agent, flags);
}

function formatResult(result, agent, flags) {
  if (flags.attach) {
    return { exitCode: result.status || 0, stdout: `[metis] ${agent.name} exited with status ${result.status}\n`, stderr: '' };
  }
  if (flags.json) {
    return { exitCode: result.ok ? 0 : (result.status || 1), stdout: `${stableJson(driver.resultToJson(result, agent))}\n`, stderr: '' };
  }
  const trailer = result.ok ? '' : `${result.stderr || ''}[metis] ${agent.name} exited with status ${result.status}${result.timedOut ? ' (timed out)' : ''}\n`;
  return { exitCode: result.ok ? 0 : (result.status || 1), stdout: result.stdout || '', stderr: trailer };
}

async function startDriverSession(root, request, deps = {}) {
  const agent = findAgent(request.positionals[0]);
  if (!agent) {
    process.stderr.write(`Unknown agent: ${request.positionals[0] || '(none)'}\n`);
    return { exitCode: 2 };
  }
  const flags = request.flags;
  const io = deps.io || createReadlineIo();
  const runner = deps.runner || ((agentArg, mode, opts, context) => driver.executeRun(agentArg, mode, opts, context));
  await runDriverSession({
    agent,
    root,
    env: deps.env || process.env,
    io,
    runner,
    yolo: flags.yolo,
    model: flags.model,
    json: flags.json,
    timeoutMs: flags.timeout ? Number(flags.timeout) : DEFAULT_TIMEOUT_MS,
  });
  return { exitCode: 0 };
}

function fail(exitCode, message) {
  return { exitCode, stdout: '', stderr: `${message}\n` };
}

module.exports = { DEFAULT_TIMEOUT_MS, listAgentsWorkflow, runDriverWorkflow, startDriverSession };
