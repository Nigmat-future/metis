#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const EVIDENCE_DIR = path.join(ROOT, '.omo', 'evidence');

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'metis-install-smoke-'));
  const logs = [];
  try {
    const pack = spawnSync('npm', ['pack', '--silent'], { cwd: ROOT, encoding: 'utf8', shell: true });
    if (pack.status !== 0) throw new Error(pack.stderr || pack.stdout || 'npm pack failed');
    const tarballName = pack.stdout.trim().split(/\r?\n/).pop();
    const packedTarball = path.join(ROOT, tarballName);
    const installDir = path.join(tempRoot, 'install');
    fs.mkdirSync(installDir, { recursive: true });
    fs.writeFileSync(path.join(installDir, 'package.json'), `${JSON.stringify({ name: 'metis-smoke-root', private: true }, null, 2)}\n`, 'utf8');
    const localTarball = path.join(installDir, tarballName);
    fs.copyFileSync(packedTarball, localTarball);
    const install = spawnSync('npm', ['install', localTarball], { cwd: installDir, encoding: 'utf8', shell: true });
    if (install.status !== 0) throw new Error(install.stderr || install.stdout || 'npm install failed');

    const pkgRoot = path.join(installDir, 'node_modules', 'metis');
    if (!fs.existsSync(path.join(pkgRoot, 'package.json'))) {
      throw new Error('metis package missing after npm install');
    }
    const metisJs = path.join(pkgRoot, 'bin', 'metis.js');
    const pcaJs = path.join(pkgRoot, 'bin', 'pca.js');
    const fixtureRoot = seedFixture(installDir);
    const dryRunScript = path.join(ROOT, 'test', 'fixtures', 'tui', 'dry-run.txt');

    const commands = [
      [metisJs, ['--help']],
      [pcaJs, ['--help']],
      [metisJs, ['doctor', '--fixture', fixtureRoot]],
      [metisJs, ['scan', '--fixture', fixtureRoot]],
      [metisJs, ['evolve', '--dry-run', '--fixture', fixtureRoot]],
      [metisJs, ['gui', '--preview', '--fixture', fixtureRoot, '--out', path.join(tempRoot, 'preview.html')]],
      [metisJs, ['tui', '--fixture', fixtureRoot, '--script', dryRunScript]],
      [metisJs, ['evolve', '--save-proposal', '--yes', '--fixture', fixtureRoot]],
      [metisJs, ['proposal', 'list', '--fixture', fixtureRoot]],
    ];

    for (const [bin, args] of commands) {
      const result = spawnSync(process.execPath, [bin, ...args], { cwd: installDir, encoding: 'utf8' });
      logs.push(`$ node ${path.basename(bin)} ${args.join(' ')}\nexit=${result.status}\n${result.stdout}${result.stderr}`);
      if (result.status !== 0) throw new Error(`install smoke failed: ${bin} ${args.join(' ')}`);
    }

    const packList = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', shell: true });
    const parsed = JSON.parse(packList.stdout.trim());
    const files = (Array.isArray(parsed) ? parsed[0] : parsed).files.map((item) => item.path);
    if (files.some((file) => file.startsWith('.omo/evidence'))) throw new Error('package contains .omo/evidence');

    const out = path.join(EVIDENCE_DIR, 'task-11-install-smoke-pass.txt');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${logs.join('\n\n')}\n`, 'utf8');
    process.stdout.write('install smoke passed\n');
  } catch (error) {
    const out = path.join(EVIDENCE_DIR, 'task-11-install-smoke-failure.txt');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${error.message}\n\n${logs.join('\n\n')}\n`, 'utf8');
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  } finally {
    try {
      const packed = fs.readdirSync(ROOT).filter((name) => /^metis-.*\.tgz$/.test(name));
      for (const name of packed) fs.rmSync(path.join(ROOT, name), { force: true });
    } catch (_) {
      // Ignore tarball cleanup failure.
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function seedFixture(baseDir) {
  const fixtureRoot = path.join(baseDir, 'fixture');
  fs.mkdirSync(fixtureRoot, { recursive: true });
  fs.writeFileSync(path.join(fixtureRoot, 'CLAUDE.md'), '# Project\n\nManual notes\n', 'utf8');
  fs.writeFileSync(path.join(fixtureRoot, 'AGENTS.md'), '# Agents\n', 'utf8');
  fs.writeFileSync(path.join(fixtureRoot, 'package.json'), JSON.stringify({ name: 'smoke-fixture', scripts: { test: 'node --test' } }, null, 2), 'utf8');
  return fixtureRoot;
}

main();
