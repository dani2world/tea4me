const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { postWorkDir, DATA_POSTS_DIR } = require('../paths');

function newPostId() {
  return randomUUID();
}

function statusPath(postId) {
  return path.join(postWorkDir(postId), 'status.json');
}

function contentPath(postId) {
  return path.join(postWorkDir(postId), 'content.json');
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

// 상태 기록 실패가 파이프라인 자체를 무너뜨리면 안 되므로 조용히 삼킨다
// (autoBLOG의 writeStatus와 동일한 방어 패턴).
function writeJsonSafe(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`파일 쓰기 실패 (${filePath}):`, e.message);
  }
}

function readStatus(postId) {
  return readJson(statusPath(postId), { stage: 'unknown' });
}

function writeStatus(postId, patch) {
  const current = readStatus(postId);
  writeJsonSafe(statusPath(postId), { ...current, ...patch, updatedAt: new Date().toISOString() });
}

function readContent(postId) {
  return readJson(contentPath(postId));
}

function writeContent(postId, content) {
  writeJsonSafe(contentPath(postId), content);
}

// 브라우저를 닫았다 다시 열어도(혹은 다른 방식으로 파이프라인이 트리거됐어도)
// 편집을 이어갈 수 있도록, 아직 발행되지 않은 채 준비된 초안을 찾아준다.
function findLatestReadyPost(kind) {
  if (!fs.existsSync(DATA_POSTS_DIR)) return null;

  const candidates = fs
    .readdirSync(DATA_POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ id: entry.name, status: readStatus(entry.name) }))
    .filter(({ status }) => status.kind === kind && status.stage === 'ready')
    .sort((a, b) => new Date(b.status.updatedAt) - new Date(a.status.updatedAt));

  return candidates[0]?.id || null;
}

module.exports = { newPostId, readStatus, writeStatus, readContent, writeContent, findLatestReadyPost };
