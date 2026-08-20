const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { CONTENT_POSTS_DIR } = require('../paths');

// "**용어(한자/영문 병기)**뒤에조사" 패턴은 CommonMark 규칙상 닫는 **가 괄호(구두점)
// 바로 뒤·공백 없는 글자 바로 앞에 끼면 볼드로 인식되지 않아 별표가 그대로 노출된다
// (예: "**일호일차(一壺一茶)**예요" -> 렌더링 시 "**일호일차(一壺一茶)**예요" 그대로 남음).
// 병기 괄호를 볼드 밖으로 빼면(예: "**일호일차**(一壺一茶)예요") 문제없이 렌더링되므로
// 발행 직전에 자동으로 교정한다. 괄호 뒤에 공백이나 문장부호가 오는 경우는 이미
// 정상 렌더링되므로 건드리지 않는다.
function fixBoldParenSpacing(body) {
  return body.replace(/\*\*([^*\n()]+)\(([^)]*)\)\*\*(?=[\p{L}\p{N}])/gu, '**$1**($2)');
}

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
  const fileContent = `---\n${frontmatter}---\n\n${fixBoldParenSpacing(body.trim())}\n`;
  fs.writeFileSync(path.join(postDir, 'index.md'), fileContent, 'utf8');

  return { postDir, relativePath: path.relative(path.join(CONTENT_POSTS_DIR, '..', '..', '..'), postDir) };
}

module.exports = { writePost };
