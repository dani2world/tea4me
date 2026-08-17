const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { CONTENT_POSTS_DIR } = require('../paths');

/**
 * @param {object} params
 * @param {object} params.data frontmatter fields matching src/content.config.ts (pubDate as "YYYY-MM-DD" string)
 * @param {string} params.body markdown body (already includes the humanNote 인용구, 본문 인라인 이미지 참조 포함)
 * @param {string} params.coverImageSourcePath absolute path to the image file to copy in as cover.jpg
 * @param {Array<{sourcePath: string, filename: string}>} [params.extraImages] 본문에서 참조하는 인라인 이미지들
 */
function writePost({ data, body, coverImageSourcePath, extraImages = [] }) {
  const postDir = path.join(CONTENT_POSTS_DIR, data.slug);
  fs.mkdirSync(postDir, { recursive: true });

  fs.copyFileSync(coverImageSourcePath, path.join(postDir, 'cover.jpg'));
  for (const img of extraImages) {
    fs.copyFileSync(img.sourcePath, path.join(postDir, img.filename));
  }

  const frontmatter = yaml.dump(data, { lineWidth: -1, skipInvalid: true });
  const fileContent = `---\n${frontmatter}---\n\n${body.trim()}\n`;
  fs.writeFileSync(path.join(postDir, 'index.md'), fileContent, 'utf8');

  return { postDir, relativePath: path.relative(path.join(CONTENT_POSTS_DIR, '..', '..', '..'), postDir) };
}

module.exports = { writePost };
