// "오늘의 차" 추천풀 — admin/data/todayTeaPool.xlsx 를 읽고 쓴다.
//
// 시트 컬럼: No. / 상황·시기 / 오늘의 분위기 / 추천 차 / 오늘의 차 한마디 /
//            Brewing Tip / With / Today's moment
//
// 상황·시기 ↔ 분위기 ↔ Today's moment 는 1:1로 고정되어 있어서, 실질적인 필터 축은
// "상황" 하나다. 계절은 상황 이름에서 파생한다 (엑셀에 계절 컬럼이 따로 없음).
// 가을·겨울 상황이 엑셀에 추가되면 SEASON_RULES 만 늘리면 그대로 잡힌다.

const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { DATA_DIR } = require('../paths');
const { refineMessage } = require('./koreanText');

const POOL_FILE = path.join(DATA_DIR, 'todayTeaPool.xlsx');
const SHEET_NAME = '오늘의 차 500';

const COL = { no: 1, situation: 2, mood: 3, name: 4, message: 5, brewingTip: 6, pairing: 7, moment: 8 };

// 앞에서부터 먼저 걸리는 규칙이 이긴다 — "초여름"이 "봄"보다 먼저 검사돼야 한다.
const SEASON_RULES = [
  [/여름|장마/, '여름'],
  [/봄|꽃/, '봄'],
  [/가을|단풍/, '가을'],
  [/겨울|눈|한파/, '겨울'],
];

function seasonOf(situation) {
  for (const [pattern, season] of SEASON_RULES) {
    if (pattern.test(situation)) return season;
  }
  return '전체';
}

let cache = null;

function readSheet() {
  if (cache) return cache;
  if (!fs.existsSync(POOL_FILE)) {
    throw new Error(`추천풀 엑셀이 없습니다: ${POOL_FILE}`);
  }

  const workbook = new ExcelJS.Workbook();
  // exceljs 의 동기 읽기는 없어서, 서버 기동 후 첫 요청에서 한 번만 비동기로 읽고 캐시한다.
  cache = workbook.xlsx.readFile(POOL_FILE).then(() => {
    const sheet = workbook.getWorksheet(SHEET_NAME) || workbook.worksheets[0];
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // 헤더
      const cell = (key) => {
        const value = row.getCell(COL[key]).value;
        return value == null ? '' : String(value).trim();
      };
      const situation = cell('situation');
      if (!situation) return;
      rows.push({
        no: Number(cell('no')) || rowNumber - 1,
        rowNumber,
        situation,
        season: seasonOf(situation),
        mood: cell('mood'),
        name: cell('name'),
        message: cell('message'),
        brewingTip: cell('brewingTip'),
        pairing: cell('pairing'),
        moment: cell('moment'),
      });
    });
    return { workbook, sheet, rows };
  });

  return cache;
}

/** 계절 → 상황 목록. 어드민 필터가 이 구조를 그대로 그린다. */
async function getSituations() {
  const { rows } = await readSheet();
  const bySituation = new Map();

  for (const row of rows) {
    if (!bySituation.has(row.situation)) {
      bySituation.set(row.situation, {
        situation: row.situation,
        season: row.season,
        mood: row.mood,
        moment: row.moment,
        count: 0,
      });
    }
    bySituation.get(row.situation).count += 1;
  }

  const situations = [...bySituation.values()];
  const seasonOrder = ['봄', '여름', '가을', '겨울', '전체'];
  const seasons = seasonOrder
    .filter((season) => situations.some((s) => s.season === season))
    .map((season) => ({
      season,
      situations: situations.filter((s) => s.season === season),
    }));

  return { seasons, total: rows.length };
}

// 엑셀의 Today's moment 는 "창문을 열 듯 마음도 환기하고 싶은" 처럼 관형형으로 끝나
// 뒤에 받을 명사가 없다. 상황 이름에서 시간대를 뽑아 붙여 문장을 닫는다.
function momentPhrase(moment, situation) {
  if (!moment) return '';
  if (/[.!?]$/.test(moment) || !/(은|는)$/.test(moment)) return moment;
  const timeWord = (situation.match(/아침|오후|저녁|밤|새벽/) || ['날'])[0];
  return `${moment} ${timeWord}`;
}

/** 엑셀 원본 행을 카드에 쓸 형태로 다듬는다. */
function toCandidate(row) {
  const { message, rawMessage } = refineMessage(row.message, {
    teaName: row.name,
    brewingTip: row.brewingTip,
    pairing: row.pairing,
    mood: row.mood,
  });
  return {
    no: row.no,
    season: row.season,
    situation: row.situation,
    mood: row.mood,
    name: row.name,
    message,
    rawMessage,
    brewingTip: row.brewingTip,
    pairing: row.pairing,
    moment: momentPhrase(row.moment, row.situation),
  };
}

/**
 * 조건에 맞는 행 중 하나를 무작위로 고른다.
 * excludeNos 는 "다시 가져오기"를 눌렀을 때 방금 본 후보가 또 나오지 않게 하는 용도.
 */
async function pickCandidate({ season, situation, excludeNos = [] } = {}) {
  const { rows } = await readSheet();

  let pool = rows;
  if (situation) pool = pool.filter((r) => r.situation === situation);
  else if (season) pool = pool.filter((r) => r.season === season);
  if (pool.length === 0) return null;

  // 후보를 다 돌아본 뒤엔 제외 목록을 무시하고 다시 처음부터.
  const fresh = pool.filter((r) => !excludeNos.includes(r.no));
  const target = fresh.length > 0 ? fresh : pool;

  return toCandidate(target[Math.floor(Math.random() * target.length)]);
}

async function getCandidateByNo(no) {
  const { rows } = await readSheet();
  const row = rows.find((r) => r.no === Number(no));
  return row ? toCandidate(row) : null;
}

/**
 * 운영자가 어드민에서 고친 문구를 엑셀 원본에 되돌려 쓴다.
 * 한마디는 원문 문장 전체가 아니라 다듬은 문장으로 덮어쓴다 — 다음에 같은 행을
 * 뽑았을 때 이미 고쳐진 문구가 나오도록.
 */
async function updateRow(no, fields) {
  const { workbook, sheet, rows } = await readSheet();
  const row = rows.find((r) => r.no === Number(no));
  if (!row) throw new Error(`추천풀에 No.${no} 행이 없습니다.`);

  const sheetRow = sheet.getRow(row.rowNumber);
  const writable = ['name', 'message', 'brewingTip', 'pairing', 'moment'];

  for (const key of writable) {
    const value = fields[key];
    if (typeof value !== 'string' || value.trim() === '') continue;
    sheetRow.getCell(COL[key]).value = value.trim();
    row[key] = value.trim(); // 캐시도 함께 갱신
  }
  sheetRow.commit();

  await workbook.xlsx.writeFile(POOL_FILE);
  return toCandidate(row);
}

module.exports = { getSituations, pickCandidate, getCandidateByNo, updateRow, seasonOf, POOL_FILE };
