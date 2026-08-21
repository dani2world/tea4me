const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { CONTENT_POSTS_DIR, DATA_POSTS_DIR } = require('../paths');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]);
  } catch (e) {
    return null;
  }
}

/** 이미 발행된 글의 제목/카테고리/태그 목록을 읽어온다 (주제 중복 방지용). */
function listPublishedPosts() {
  if (!fs.existsSync(CONTENT_POSTS_DIR)) return [];

  return fs
    .readdirSync(CONTENT_POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const indexPath = path.join(CONTENT_POSTS_DIR, entry.name, 'index.md');
      if (!fs.existsSync(indexPath)) return null;
      const data = parseFrontmatter(fs.readFileSync(indexPath, 'utf8'));
      if (!data) return null;
      return {
        slug: data.slug || entry.name,
        title: data.title,
        category: data.category,
        tags: data.tags || [],
        type: data.type,
      };
    })
    .filter(Boolean);
}

/**
 * 발행 목록만 보면 "생성은 됐지만 마음에 안 들어 발행하지 않은 주제"를 AI가 또
 * 고를 수 있다. admin/data/posts에 남아있는, 아직 발행되지 않은 과거 생성 시도의
 * 주제도 함께 중복 방지 목록에 넣기 위한 함수.
 */
function listRecentDraftTopics(kind) {
  if (!fs.existsSync(DATA_POSTS_DIR)) return [];

  return fs
    .readdirSync(DATA_POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const statusPath = path.join(DATA_POSTS_DIR, entry.name, 'status.json');
      const contentPath = path.join(DATA_POSTS_DIR, entry.name, 'content.json');
      if (!fs.existsSync(statusPath) || !fs.existsSync(contentPath)) return null;
      try {
        const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
        const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
        if (status.kind !== kind || status.stage === 'published' || !content.title) return null;
        return { title: content.title, category: content.category };
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = { listPublishedPosts, listRecentDraftTopics };
