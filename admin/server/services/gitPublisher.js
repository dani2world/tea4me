const path = require('node:path');
const simpleGit = require('simple-git');
const { REPO_ROOT } = require('../paths');

const git = simpleGit(REPO_ROOT);

// 발행은 데이터 파일만 커밋하는 게 원칙이지만, 그 데이터를 해석하는 소스가 로컬에만
// 남아 있으면 원격에서 "새 데이터 + 옛 스키마"가 만나 빌드가 깨진다. 실제로
// teas.yaml 만 올라가고 content.config.ts 가 안 올라가 배포가 실패한 적이 있다.
// 그래서 데이터가 의존하는 소스가 수정돼 있으면 같은 커밋에 함께 싣는다.
const SCHEMA_FILES = ['src/content.config.ts'];

/** git이 쓰는 표기(슬래시)로 맞춘다 — Windows의 path.relative는 역슬래시를 준다. */
function toGitPath(absPath) {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
}

/** 후보 중 실제로 커밋되지 않은 변경이 있는 것만 추린다. */
async function dirtyAmong(candidates) {
  if (candidates.length === 0) return [];
  const status = await git.status();
  const dirty = new Set([...status.modified, ...status.not_added, ...status.created, ...status.renamed.map((r) => r.to)]);
  return candidates.filter((file) => dirty.has(file));
}

/** 함께 싣지 않은 src/ 변경 — 이것들 때문에 빌드가 깨질 수도 있으니 호출부에 알린다. */
async function otherDirtySources(included) {
  const status = await git.status();
  const includedSet = new Set(included);
  return [...status.modified, ...status.not_added, ...status.created]
    .filter((file) => file.startsWith('src/') && !includedSet.has(file));
}

/**
 * postDir(파일 또는 디렉터리)를 커밋하고 푸시한다.
 * alsoInclude 에는 이 발행이 의존하는 소스 경로를 repo 기준 상대경로로 넘긴다 —
 * 그중 실제로 수정된 것만 함께 커밋된다.
 */
async function publish({ postDir, message, alsoInclude = [] }) {
  const relPath = toGitPath(postDir);
  const extras = await dirtyAmong([...SCHEMA_FILES, ...alsoInclude]);

  await git.add([relPath, ...extras]);
  await git.commit(message);
  await git.push('origin', 'main');

  return { includedSources: extras, otherDirtySources: await otherDirtySources([relPath, ...extras]) };
}

module.exports = { publish };
