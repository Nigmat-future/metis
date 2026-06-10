#!/usr/bin/env node

const { run } = require('../lib/cli/commands');
const { runInteractiveTui } = require('../lib/tui');

async function main() {
  const argv = process.argv.slice(2);
  const cwd = process.cwd();
  const isTui = argv[0] === 'tui' && !argv.includes('--script') && process.stdout.isTTY;
  const isDriverSession = argv[0] === 'run' && argv.includes('--interactive') && process.stdin.isTTY;

  if (isDriverSession) {
    const { parseArgs } = require('../lib/cli/args');
    const { resolveRootWorkflow } = require('../lib/workflows');
    const { formatHelp } = require('../lib/cli/output');
    const { startDriverSession } = require('../lib/workflows/driver');
    const parsed = parseArgs(argv);
    if (!parsed.ok) {
      process.stderr.write(`${parsed.error}\n\n${formatHelp({ brand: 'metis' })}`);
      process.exitCode = 2;
      return;
    }
    const rootResult = resolveRootWorkflow(parsed.value.flags.fixture, cwd);
    if (!rootResult.ok) {
      process.stderr.write(`${rootResult.error}\n`);
      process.exitCode = 2;
      return;
    }
    const result = await startDriverSession(rootResult.root, parsed.value);
    process.exitCode = result.exitCode;
    return;
  }

  if (isTui) {
    const { parseArgs } = require('../lib/cli/args');
    const { resolveRootWorkflow } = require('../lib/workflows');
    const { formatHelp } = require('../lib/cli/output');
    const parsed = parseArgs(argv);
    if (!parsed.ok) {
      process.stderr.write(`${parsed.error}\n\n${formatHelp({ brand: 'metis' })}`);
      process.exitCode = 2;
      return;
    }
    const rootResult = resolveRootWorkflow(parsed.value.flags.fixture, cwd);
    if (!rootResult.ok) {
      process.stderr.write(`${rootResult.error}\n`);
      process.exitCode = 2;
      return;
    }
    const result = await runInteractiveTui(rootResult.root, parsed.value.flags);
    process.exitCode = result.exitCode;
    return;
  }

  const result = run(argv, cwd, { brand: 'metis' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
