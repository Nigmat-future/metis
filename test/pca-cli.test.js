const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { copyFixtureToTemp, fixturePath, snapshotFiles } = require('./helpers/fixtures');

const cli = path.join(__dirname, '..', 'bin', 'pca.js');
const repoRoot = path.join(__dirname, '..');

function run(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
  });
}

function output(result) {
  return `${result.stdout}\n${result.stderr}`;
}

test('scan reports Claude, Codex, and project evidence without writes', () => {
  const root = copyFixtureToTemp('mixed-agent-project');

  const result = run(['scan', '--fixture', root]);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Metis: scanning local agent evidence/);
  assert.match(result.stdout, /claude-code\s+instruction-file\s+present/);
  assert.match(result.stdout, /codex\s+instruction-file\s+present/);
  assert.match(result.stdout, /project\s+project-script\s+present - package script test/);
  assert.match(result.stdout, /Writes: none/);
  assert.strictEqual(fs.existsSync(path.join(root, '.pca')), false);
});

test('plan prints evidence-backed candidates with review metadata', () => {
  const result = run(['plan', '--fixture', fixturePath('mixed-agent-project')]);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Extracted behavior candidates/);
  assert.match(result.stdout, /Run npm test before final answer/);
  assert.match(result.stdout, /Evidence: ev_/);
  assert.match(result.stdout, /Proposed target: AGENTS.md, CLAUDE.md/);
  assert.match(result.stdout, /Risk: low/);
  assert.match(result.stdout, /Decision: generate/);
  assert.match(result.stdout, /Writes: none/);
});

test('init dry-run prints real diffs and writes no target files', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const before = snapshotFiles(root);

  const result = run(['init', '--dry-run', '--fixture', root]);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /--- a\/CLAUDE\.md/);
  assert.match(result.stdout, /\+\+\+ b\/AGENTS\.md/);
  assert.match(result.stdout, /\.cursor\/rules\/personal-agent\.mdc/);
  assert.match(result.stdout, /\.metis\/evidence\/index\.json/);
  assert.deepStrictEqual(snapshotFiles(root), before);
});

test('apply writes whitelist files and rollback restores prior state', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const before = snapshotFiles(root);

  const apply = run(['init', '--apply', '--yes', '--fixture', root]);
  assert.strictEqual(apply.status, 0, output(apply));
  const rollbackId = /Rollback ID: (\S+)/.exec(apply.stdout)[1];

  assert.ok(fs.existsSync(path.join(root, 'CLAUDE.md')));
  assert.ok(fs.existsSync(path.join(root, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(root, '.cursor', 'rules', 'personal-agent.mdc')));
  assert.ok(fs.existsSync(path.join(root, '.metis', 'evidence', 'index.json')));
  assert.ok(fs.existsSync(path.join(root, '.metis', 'rollback', `${rollbackId}.json`)));
  assert.match(rollbackId, /^metis-/);

  const rollback = run(['rollback', rollbackId, '--fixture', root]);
  assert.strictEqual(rollback.status, 0, output(rollback));
  assert.deepStrictEqual(snapshotFiles(root), before);
});

test('evolve dry-run proposes changes without writing', () => {
  const root = copyFixtureToTemp('mixed-agent-project');
  const before = snapshotFiles(root);

  const result = run(['evolve', '--dry-run', '--fixture', root]);

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Evolution proposal/);
  assert.match(result.stdout, /Writes: none/);
  assert.deepStrictEqual(snapshotFiles(root), before);
});

test('include-history reads bounded redacted snippets only when opted in', () => {
  const plain = run(['scan', '--fixture', fixturePath('history-project'), '--json']);
  const history = run(['scan', '--fixture', fixturePath('history-project'), '--include-history', '--json']);

  assert.strictEqual(plain.status, 0);
  assert.strictEqual(history.status, 0);
  assert.doesNotMatch(plain.stdout, /history-snippet/);
  assert.match(history.stdout, /history-snippet/);
  assert.doesNotMatch(output(history), /sk-pca-fake-secret/);
  assert.doesNotMatch(output(history), /very-private-name/);
});

test('sensitive canaries are redacted and prompt injection blocks generation', () => {
  const scan = run(['scan', '--fixture', fixturePath('sensitive-metadata-project'), '--json']);
  const init = run(['init', '--dry-run', '--fixture', fixturePath('sensitive-metadata-project')]);

  assert.strictEqual(scan.status, 0);
  assert.doesNotMatch(output(scan), /sk-pca-fake-secret/);
  assert.doesNotMatch(output(scan), /internal\.customer\.example/);
  assert.doesNotMatch(output(scan), /VeryPrivateName/);
  assert.doesNotMatch(output(scan), /ignore previous instructions/);
  assert.strictEqual(init.status, 1);
  assert.match(init.stderr, /Safety audit failed/);
});

test('invalid arguments and fixture roots fail before scanning', () => {
  const fileRoot = path.join(os.tmpdir(), `pca-file-${Date.now()}`);
  fs.writeFileSync(fileRoot, 'not a directory');

  const missingValue = run(['scan', '--fixture']);
  const flagValue = run(['scan', '--fixture', '--dry-run']);
  const fileFixture = run(['scan', '--fixture', fileRoot]);
  const applyWithoutYes = run(['init', '--apply']);
  const rollbackMissing = run(['rollback']);

  assert.strictEqual(missingValue.status, 2);
  assert.strictEqual(flagValue.status, 2);
  assert.strictEqual(fileFixture.status, 2);
  assert.strictEqual(applyWithoutYes.status, 2);
  assert.strictEqual(rollbackMissing.status, 2);
  assert.doesNotMatch(missingValue.stdout, /Scanning local agent evidence/);
});

test('invalid fixture errors mask private home path segments', () => {
  const result = run(['scan', '--fixture', 'C:\\Users\\VeryPrivateName\\missing-project']);

  assert.strictEqual(result.status, 2);
  assert.doesNotMatch(output(result), /VeryPrivateName/);
  assert.match(result.stderr, /~/);
});

test('symlink scan root is rejected when platform permits symlink creation', () => {
  const target = copyFixtureToTemp('symlink-project');
  const link = path.join(os.tmpdir(), `pca-link-${Date.now()}`);
  try {
    fs.symlinkSync(target, link, 'dir');
  } catch (_) {
    return;
  }

  const result = run(['scan', '--fixture', link]);

  assert.strictEqual(result.status, 2);
  assert.match(result.stderr, /symlink/);
});

test('source files do not introduce remote-call modules or calls', () => {
  const files = listJsFiles(path.join(repoRoot, 'bin')).concat(listJsFiles(path.join(repoRoot, 'lib')));
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /node:(?:http|https|net|tls)\b/);
    assert.doesNotMatch(source, /require\(['"](?:http|https|net|tls)['"]\)/);
    assert.doesNotMatch(source, /\bfetch\s*\(/);
  }
});

function listJsFiles(root) {
  const files = [];
  walk(root);
  return files;

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
    }
  }
}
