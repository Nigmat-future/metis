const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const script = path.join(__dirname, '..', 'scripts', 'check-docs.js');
const repoRoot = path.join(__dirname, '..');

function run(args = []) {
  return spawnSync(process.execPath, [script, ...args], { cwd: repoRoot, encoding: 'utf8' });
}

test('doc consistency check passes on product docs', () => {
  const result = run();
  assert.strictEqual(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /doc consistency check passed/);
});

test('README opens with personal local product narrative before command flow', () => {
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const opening = readme.split(/\r?\n/).slice(0, 60).join('\n');
  const commandIndex = opening.search(/```bash|\bnode\s+bin\/metis\.js|\bmetis\s+(doctor|scan|plan|init|tui)\b/i);
  const storyIndex = opening.search(/repeated AI coding corrections/i);

  for (const marker of ['repeated AI coding corrections', 'Before', 'After', 'personal', 'local', 'reviewable', 'reversible']) {
    assert.match(opening, new RegExp(marker, 'i'), `README opening should include ${marker}`);
  }
  assert.notStrictEqual(storyIndex, -1, 'README opening should include the product story');
  assert.ok(commandIndex === -1 || commandIndex > storyIndex, 'commands should not appear before the story');
});

test('doc consistency check rejects README opening without personal local narrative', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-doc-check-'));
  fs.mkdirSync(path.join(temp, 'docs'), { recursive: true });
  fs.cpSync(path.join(repoRoot, 'docs', 'PRODUCT-GRADE.md'), path.join(temp, 'docs', 'PRODUCT-GRADE.md'));
  fs.writeFileSync(path.join(temp, 'README.md'), '# Metis\n\n```bash\nmetis scan\n```\n');

  const result = run([temp]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /README opening narrative/);
});

test('doc consistency check rejects forbidden GUI apply claim', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-doc-check-'));
  fs.mkdirSync(path.join(temp, 'docs'), { recursive: true });
  fs.cpSync(path.join(repoRoot, 'docs', 'PRODUCT-GRADE.md'), path.join(temp, 'docs', 'PRODUCT-GRADE.md'));
  fs.writeFileSync(path.join(temp, 'README.md'), '# Metis\n\nUse the GUI apply button today.\n');

  const result = run([temp]);
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /forbidden GUI apply button/);
});
