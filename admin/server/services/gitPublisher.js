const path = require('node:path');
const simpleGit = require('simple-git');
const { REPO_ROOT } = require('../paths');

const git = simpleGit(REPO_ROOT);

async function publish({ postDir, message }) {
  const relPath = path.relative(REPO_ROOT, postDir);
  await git.add(relPath);
  await git.commit(message);
  await git.push('origin', 'main');
}

module.exports = { publish };
