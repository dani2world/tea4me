const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { CONTENT_TEAS_FILE } = require('../paths');

const HEADER = `# "오늘의 차" 위젯이 참조하는 등록 목록.
# 어드민(admin/)의 "오늘의 차 등록"에서 추천풀(admin/data/todayTeaPool.xlsx)의 한 건을
# 골라 등록하면 여기에 쌓인다. 등록한 날짜(date)에 고정 노출되고, 등록을 건너뛴 날은
# 같은 계절의 과거 등록분에서 자동으로 하나가 뽑힌다 — src/lib/todayTea.ts 참고.
`;

const FIELD_ORDER = [
  'slug',
  'name',
  'date',
  'season',
  'situation',
  'mood',
  'message',
  'brewingTip',
  'pairing',
  'moment',
  'sourceNo',
];

function readCatalog() {
  if (!fs.existsSync(CONTENT_TEAS_FILE)) return [];
  const raw = fs.readFileSync(CONTENT_TEAS_FILE, 'utf8');
  return yaml.load(raw) || [];
}

// 이 위젯은 마크다운을 렌더링하지 않으므로, 문구에 섞여 들어올 수 있는
// **볼드**/<u>밑줄</u> 표기를 벗겨서 그대로 노출되지 않게 한다.
function stripMarkup(text) {
  return typeof text === 'string' ? text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/<\/?u>/g, '') : text;
}

function orderFields(entry) {
  const ordered = {};
  for (const key of FIELD_ORDER) {
    if (entry[key] !== undefined && entry[key] !== '') ordered[key] = entry[key];
  }
  return ordered;
}

/** 같은 날짜(date)에 이미 등록된 항목이 있으면 그것을 대체한다 — 하루에 한 잔. */
function writeTea(entry) {
  const clean = orderFields(
    Object.fromEntries(Object.entries(entry).map(([k, v]) => [k, stripMarkup(v)])),
  );

  const catalog = readCatalog();
  const idx = catalog.findIndex((t) => t.date === clean.date);
  if (idx >= 0) catalog[idx] = clean;
  else catalog.push(clean);

  catalog.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  fs.mkdirSync(path.dirname(CONTENT_TEAS_FILE), { recursive: true });
  fs.writeFileSync(
    CONTENT_TEAS_FILE,
    HEADER + '\n' + yaml.dump(catalog, { lineWidth: -1, skipInvalid: true, quotingType: '"' }),
    'utf8',
  );
  return catalog;
}

module.exports = { readCatalog, writeTea };
