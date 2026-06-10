const COMMANDS = new Set(['scan', 'plan', 'init', 'rollback', 'evolve', 'proposal', 'tui', 'gui', 'doctor']);
const VALUE_FLAGS = new Set(['--fixture', '--script', '--out']);
const BOOL_FLAGS = new Set(['--include-history', '--json', '--dry-run', '--apply', '--yes', '--preview', '--save-proposal']);

function parseArgs(argv) {
  if (!argv.length || argv[0] === '--help' || argv[0] === '-h') {
    return { ok: true, value: { command: 'help', flags: emptyFlags(), positionals: [] } };
  }
  const command = argv[0];
  if (!COMMANDS.has(command)) return fail(`Unknown command: ${command}`);
  const flags = emptyFlags();
  const positionals = [];
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (VALUE_FLAGS.has(token)) {
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) return fail(`${token} requires a path value`);
      setValue(flags, token, next);
      index += 1;
      continue;
    }
    if (BOOL_FLAGS.has(token)) {
      setBool(flags, token);
      continue;
    }
    if (token.startsWith('--')) return fail(`Unknown flag: ${token}`);
    positionals.push(token);
  }
  const validation = validateCommand(command, flags, positionals);
  if (!validation.ok) return validation;
  return { ok: true, value: { command, flags, positionals } };
}

function emptyFlags() {
  return {
    fixture: undefined,
    includeHistory: false,
    json: false,
    dryRun: false,
    apply: false,
    yes: false,
    saveProposal: false,
    script: undefined,
    preview: false,
    out: undefined,
  };
}

function setValue(flags, token, value) {
  if (token === '--fixture') flags.fixture = value;
  if (token === '--script') flags.script = value;
  if (token === '--out') flags.out = value;
}

function setBool(flags, token) {
  if (token === '--include-history') flags.includeHistory = true;
  if (token === '--json') flags.json = true;
  if (token === '--dry-run') flags.dryRun = true;
  if (token === '--apply') flags.apply = true;
  if (token === '--yes') flags.yes = true;
  if (token === '--preview') flags.preview = true;
  if (token === '--save-proposal') flags.saveProposal = true;
}

function validateCommand(command, flags, positionals) {
  if (flags.dryRun && flags.apply) return fail('--dry-run and --apply cannot be used together');
  if (flags.yes && !yesAllowed(command, flags, positionals)) return fail('--yes is only valid with init --apply, evolve --save-proposal, proposal dismiss, or proposal accept --apply');
  if (command === 'doctor' && positionals.length) return fail('doctor does not accept positional arguments');
  if (command === 'doctor' && (flags.dryRun || flags.apply || flags.yes || flags.script || flags.preview || flags.out || flags.saveProposal)) {
    return fail('doctor accepts --fixture, --include-history, and --json only');
  }
  if ((command === 'scan' || command === 'plan') && (flags.dryRun || flags.apply || flags.yes || flags.script || flags.preview || flags.out || flags.saveProposal)) {
    return fail(`${command} does not accept init/evolve/ui flags`);
  }
  if (command === 'init' && positionals.length) return fail('init does not accept positional arguments');
  if (command === 'init' && !flags.dryRun && !flags.apply) return fail('init requires --dry-run or --apply');
  if (command === 'init' && flags.apply && !flags.yes) return fail('init --apply requires --yes after reviewing dry-run output');
  if (command === 'rollback' && positionals.length !== 1) return fail('rollback requires exactly one id');
  if (command === 'rollback' && (flags.includeHistory || flags.json || flags.dryRun || flags.apply || flags.yes || flags.script || flags.preview || flags.out || flags.saveProposal)) {
    return fail('rollback accepts only <id> and --fixture');
  }
  if (command === 'evolve') {
    if (flags.dryRun && flags.saveProposal) return fail('evolve cannot combine --dry-run and --save-proposal');
    if (!flags.dryRun && !flags.saveProposal) return fail('evolve requires --dry-run or --save-proposal --yes');
    if (flags.saveProposal && !flags.yes) return fail('evolve --save-proposal requires --yes');
    if (flags.saveProposal && (flags.apply || flags.json || flags.script || flags.preview || flags.out)) {
      return fail('evolve --save-proposal accepts --fixture and --include-history only');
    }
    if (flags.dryRun && (flags.apply || flags.yes || flags.json || flags.script || flags.preview || flags.out || flags.saveProposal)) {
      return fail('evolve --dry-run accepts --fixture and --include-history only');
    }
  }
  if (command === 'proposal') return validateProposal(flags, positionals);
  if (command === 'tui' && positionals.length) return fail('tui does not accept positional arguments');
  if (command === 'tui' && (flags.dryRun || flags.apply || flags.yes || flags.json || flags.preview || flags.out || flags.saveProposal)) {
    return fail('tui accepts --fixture, --include-history, and --script only');
  }
  if (command === 'gui' && !flags.preview) return fail('gui requires --preview in this release');
  if (command === 'gui' && positionals.length) return fail('gui does not accept positional arguments');
  if (command === 'gui' && (flags.dryRun || flags.apply || flags.yes || flags.script || flags.saveProposal)) {
    return fail('gui accepts --preview, --fixture, --include-history, --out, and --json only');
  }
  return { ok: true };
}

function validateProposal(flags, positionals) {
  const sub = positionals[0] || 'list';
  if (flags.script || flags.preview || flags.out || flags.saveProposal) return fail('proposal accepts list, inspect, dismiss, accept subcommands only');
  if (sub === 'list') {
    if (positionals.length > 1) return fail('proposal list accepts no extra arguments');
    if (flags.dryRun || flags.apply || flags.yes) return fail('proposal list accepts --fixture and --json only');
    return { ok: true };
  }
  if (sub === 'inspect') {
    if (positionals.length !== 2) return fail('proposal inspect requires <id>');
    if (flags.dryRun || flags.apply || flags.yes) return fail('proposal inspect accepts --fixture and --json only');
    return { ok: true };
  }
  if (sub === 'dismiss') {
    if (positionals.length !== 2) return fail('proposal dismiss requires <id>');
    if (!flags.yes) return fail('proposal dismiss requires --yes');
    if (flags.dryRun || flags.apply) return fail('proposal dismiss accepts --fixture and --yes only');
    return { ok: true };
  }
  if (sub === 'accept') {
    if (positionals.length !== 2) return fail('proposal accept requires <id>');
    if (flags.dryRun && flags.apply) return fail('proposal accept cannot combine --dry-run and --apply');
    if (!flags.dryRun && !(flags.apply && flags.yes)) return fail('proposal accept requires --dry-run or --apply --yes');
    if (flags.apply && !flags.yes) return fail('proposal accept --apply requires --yes');
    return { ok: true };
  }
  return fail(`Unknown proposal subcommand: ${sub}`);
}

function yesAllowed(command, flags, positionals) {
  if (command === 'init' && flags.apply) return true;
  if (command === 'evolve' && flags.saveProposal) return true;
  if (command === 'proposal' && positionals[0] === 'dismiss') return true;
  if (command === 'proposal' && positionals[0] === 'accept' && flags.apply) return true;
  return false;
}

function fail(message) {
  return { ok: false, error: message };
}

module.exports = { parseArgs };
