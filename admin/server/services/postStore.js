const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { postWorkDir } = require('../paths');

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

module.exports = { newPostId, readStatus, writeStatus, readContent, writeContent };
