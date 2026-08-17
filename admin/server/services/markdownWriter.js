const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { CONTENT_POSTS_DIR } = require('../paths');

/**
 * @param {object} params
 * @param {object} params.data frontmatter fields matching src/content.config.ts (pubDate as "YYYY-MM-DD" string)
 * @param {string} params.body markdown body (already includes the humanNote callout if applicable)
 * @param {string} params.coverImageSourcePath absolute path to the image file to copy in as cover.jpg
 */
function writePost({ data, body, coverImageSourcePath }) {
  const postDir = path.join(CONTENT_POSTS_DIR, data.slug);
  fs.mkdirSync(postDir, { recursive: true });

  fs.copyFileSync(coverImageSourcePath, path.join(postDir, 'cover.jpg'));

  const frontmatter = yaml.dump(data, { lineWidth: -1, skipInvalid: true });
  const fileContent = `---\n${frontmatter}---\n\n${body.trim()}\n`;
  fs.writeFileSync(path.join(postDir, 'index.md'), fileContent, 'utf8');

  return { postDir, relativePath: path.relative(path.join(CONTENT_POSTS_DIR, '..', '..', '..'), postDir) };
}

module.exports = { writePost };
