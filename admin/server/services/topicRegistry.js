const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { CONTENT_POSTS_DIR } = require('../paths');

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

module.exports = { listPublishedPosts };
