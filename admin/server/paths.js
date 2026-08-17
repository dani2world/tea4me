const path = require('node:path');
const fs = require('node:fs');

const ADMIN_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(ADMIN_ROOT, '..');
const CONTENT_POSTS_DIR = path.join(REPO_ROOT, 'src', 'content', 'posts');
const DATA_DIR = path.join(ADMIN_ROOT, 'data');
const DATA_POSTS_DIR = path.join(DATA_DIR, 'posts');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function postWorkDir(postId) {
  return ensureDir(path.join(DATA_POSTS_DIR, postId));
}

module.exports = {
  ADMIN_ROOT,
  REPO_ROOT,
  CONTENT_POSTS_DIR,
  DATA_DIR,
  DATA_POSTS_DIR,
  ensureDir,
  postWorkDir,
};
