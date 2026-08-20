const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { CONTENT_TEAS_FILE } = require('../paths');

const LINE_FIELDS = ['intro', 'whyPicked', 'goodPoints', 'howToBrew', 'snackPairing', 'comfortMessage'];

function readCatalog() {
  if (!fs.existsSync(CONTENT_TEAS_FILE)) return [];
  const raw = fs.readFileSync(CONTENT_TEAS_FILE, 'utf8');
  return yaml.load(raw) || [];
}

// 이 위젯은 마크다운을 렌더링하지 않으므로, AI가 블로그 글쓰기 습관대로 섞어 쓸 수 있는
// **볼드**/<u>밑줄</u> 표기를 벗겨서 그대로 노출되지 않게 한다 (프롬프트 지침의 보조 안전장치).
function stripMarkup(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/<\/?u>/g, '');
}

/** slug이 이미 있으면 그 항목을 대체(수정), 없으면 새로 추가한다. */
function writeTea(entry) {
  for (const field of LINE_FIELDS) {
    if (Array.isArray(entry[field])) entry[field] = entry[field].map(stripMarkup);
  }

  const catalog = readCatalog();
  const idx = catalog.findIndex((t) => t.slug === entry.slug);
  if (idx >= 0) catalog[idx] = entry;
  else catalog.push(entry);

  fs.mkdirSync(path.dirname(CONTENT_TEAS_FILE), { recursive: true });
  fs.writeFileSync(CONTENT_TEAS_FILE, yaml.dump(catalog, { lineWidth: -1, skipInvalid: true }), 'utf8');
  return catalog;
}

module.exports = { readCatalog, writeTea };
