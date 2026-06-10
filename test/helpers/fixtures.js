const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function fixturePath(name) {
  return path.join(__dirname, '..', 'fixtures', name);
}

function copyFixtureToTemp(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `pca-${name}-`));
  fs.cpSync(fixturePath(name), root, { recursive: true });
  return root;
}

function listRelativeFiles(root) {
  const files = [];
  walk('.');
  return files.sort();

  function walk(relativePath) {
    const absolutePath = path.join(root, relativePath);
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      const child = path.join(relativePath, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) files.push(child.replace(/\\/g, '/').replace(/^\.\//, ''));
    }
  }
}

function snapshotFiles(root) {
  return Object.fromEntries(listRelativeFiles(root).map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
}

module.exports = {
  copyFixtureToTemp,
  fixturePath,
  snapshotFiles,
};
