const express = require('express');
const { CONTENT_TEAS_FILE } = require('../paths');
const { getSituations, pickCandidate, updateRow } = require('../services/teaPool');
const { readCatalog, writeTea } = require('../services/teaWriter');
const { publish } = require('../services/gitPublisher');

const router = express.Router();

/** KST 기준 오늘 날짜 'YYYY-MM-DD'. */
function todayKST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// 슬러그는 하루 한 잔이라는 규칙에서 바로 나온다 — 운영자가 따로 입력할 게 없다.
function slugForDate(dateStr) {
  return `tea-${dateStr}`;
}

router.get('/', (req, res) => {
  res.json(readCatalog());
});

/** 어드민 필터가 그릴 계절 → 상황 트리 */
router.get('/pool/situations', async (req, res) => {
  try {
    res.json(await getSituations());
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 조건에 맞는 후보 한 건 뽑기. "다시 가져오기"는 exclude로 방금 본 걸 걸러낸다. */
router.get('/pool/pick', async (req, res) => {
  const { season, situation, exclude } = req.query;
  const excludeNos = String(exclude || '')
    .split(',')
    .map((n) => Number(n))
    .filter(Number.isFinite);

  try {
    const candidate = await pickCandidate({ season, situation, excludeNos });
    if (!candidate) {
      return res.status(404).json({ ok: false, error: '조건에 맞는 후보가 추천풀에 없습니다.' });
    }
    res.json({ ok: true, candidate, today: todayKST() });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/** 고른 후보를 오늘의 차로 등록 — teas.yaml에 쓰고, 수정분은 추천풀에도 되돌려 쓴다. */
router.post('/publish', async (req, res) => {
  const { no, name, message, brewingTip, pairing, moment, season, situation, mood } = req.body;

  const missing = [
    ['차 이름', name],
    ['한마디', message],
    ['Brewing Tip', brewingTip],
    ['With', pairing],
    ["Today's moment", moment],
  ]
    .filter(([, value]) => !String(value || '').trim())
    .map(([label]) => label);

  if (missing.length > 0) {
    return res.status(400).json({ ok: false, error: `${missing.join(', ')} 항목이 비어 있습니다.` });
  }

  const date = todayKST();
  const entry = {
    slug: slugForDate(date),
    name: name.trim(),
    date,
    season: season || '전체',
    situation,
    mood,
    message: message.trim(),
    brewingTip: brewingTip.trim(),
    pairing: pairing.trim(),
    moment: moment.trim(),
    sourceNo: Number(no) || undefined,
  };

  try {
    writeTea(entry);

    // 엑셀 되돌려쓰기는 실패해도 발행 자체를 막지 않는다 (파일이 엑셀로 열려 있는 등).
    let poolUpdated = true;
    let poolError = null;
    if (entry.sourceNo) {
      try {
        await updateRow(entry.sourceNo, { name, message, brewingTip, pairing, moment });
      } catch (err) {
        poolUpdated = false;
        poolError = err.message;
      }
    }

    // 카드가 빌드되는 데 필요한 소스 — 수정돼 있으면 데이터와 같은 커밋에 함께 실린다.
    const pushed = await publish({
      postDir: CONTENT_TEAS_FILE,
      message: `오늘의 차 등록: ${entry.name} (${date})`,
      alsoInclude: ['src/lib/todayTea.ts', 'src/components/TodayTea.astro'],
    });

    res.json({ ok: true, slug: entry.slug, date, poolUpdated, poolError, ...pushed });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
