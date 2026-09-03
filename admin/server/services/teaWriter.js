const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { CONTENT_TEAS_FILE, TEA_ARCHIVE_FILE } = require('../paths');
const { pickTodayTea } = require('./todayTeaPick');

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

const ARCHIVE_HEADER = `# "오늘의 차" 날짜별 아카이브 — 날짜 / 차 이름 / Linger with(pairing)만 기록.
# 어드민에서 명시적으로 등록(고정)한 날짜와, 등록을 건너뛰어 폴백(같은 계절 과거
# 등록분 중 해시로 결정)된 날짜가 모두 섞여 있다 — src/lib/todayTea.ts의
# pickTodayTea()와 동일한 규칙으로 계산해 채운다.
# 무언가를 발행할 때마다(오늘의 차 등록이든 글 발행이든) 그 시점 기준으로 "오늘"이
# 아직 안 채워져 있으면 자동으로 채워진다 — ensureTodayArchived() 참고. 폴백으로
# 채워진 기록은 그 시점의 추천풀 상태로 고정되며, 이후 추천풀이 바뀌어도 소급되지 않는다.
`;

function readArchive() {
  return fs.existsSync(TEA_ARCHIVE_FILE) ? yaml.load(fs.readFileSync(TEA_ARCHIVE_FILE, 'utf8')) || [] : [];
}

function writeArchive(list) {
  list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  fs.mkdirSync(path.dirname(TEA_ARCHIVE_FILE), { recursive: true });
  fs.writeFileSync(
    TEA_ARCHIVE_FILE,
    ARCHIVE_HEADER + '\n' + yaml.dump(list, { lineWidth: -1, skipInvalid: true, quotingType: '"' }),
    'utf8',
  );
  return list;
}

/** 오늘의 차 발행 때 날짜/이름/pairing만 별도 아카이브에도 쌓는다 — 같은 날짜는 덮어쓴다. */
function archiveTea({ date, name, pairing }) {
  const list = readArchive();
  const idx = list.findIndex((t) => t.date === date);
  const record = { date, name, pairing };
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  return writeArchive(list);
}

/** KST 기준 오늘 날짜 'YYYY-MM-DD'. */
function todayKST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * 무언가를 발행(git publish)하는 시점마다 호출 — "오늘" 날짜가 아직 아카이브에 없으면
 * 지금 사이트가 실제로 보여줄 값(고정 등록분이면 그것, 아니면 폴백 결과)을 계산해서
 * 채워 넣는다. 별도 cron 없이, 어드민을 쓸 때마다(글이든 차든) 자연스럽게 채워지는 방식.
 */
function ensureTodayArchived() {
  const today = todayKST();
  if (readArchive().some((t) => t.date === today)) return null;

  const pick = pickTodayTea(readCatalog(), today);
  if (!pick) return null;

  archiveTea({ date: today, name: pick.name, pairing: pick.pairing });
  return { date: today, name: pick.name, pairing: pick.pairing };
}

module.exports = { readCatalog, writeTea, archiveTea, ensureTodayArchived };
