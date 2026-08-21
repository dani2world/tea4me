// ---- 오늘의 차 등록 ----
// 추천풀(admin/data/todayTeaPool.xlsx)에서 계절·상황으로 한 건을 가져와,
// 메인 페이지에 나갈 모습 그대로 미리보기에 채운다. 미리보기의 각 문구는
// contenteditable이라 그 자리에서 고칠 수 있고, 등록하면 고친 내용이
// teas.yaml과 추천풀 엑셀 양쪽에 반영된다.

const teaSeasonsBox = document.getElementById('tea-seasons');
const teaSituationsBox = document.getElementById('tea-situations');
const teaMoodText = document.getElementById('tea-mood');
const teaPickBtn = document.getElementById('tea-pick-btn');
const teaPickError = document.getElementById('tea-pick-error');
const teaPreviewWrap = document.getElementById('tea-preview-wrap');
const teaCardDate = document.getElementById('tea-card-date');
const teaSourceText = document.getElementById('tea-source');
const teaPublishBtn = document.getElementById('tea-publish-btn');
const teaRepickBtn = document.getElementById('tea-repick-btn');
const teaPublishResult = document.getElementById('tea-publish-result');

const TEA_FIELDS = ['name', 'message', 'brewingTip', 'pairing', 'moment'];
const teaFieldEl = Object.fromEntries(TEA_FIELDS.map((f) => [f, document.getElementById(`tea-f-${f}`)]));

let seasonTree = [];
let selectedSeason = null;
let selectedSituation = null;
let currentCandidate = null;
// 같은 후보가 연달아 나오지 않게 이번 세션에서 본 것들을 기억해둔다.
const seenNos = [];

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = WEEKDAYS_KO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 ${weekday}요일`;
}

function makeChip(label, onClick) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.textContent = label;
  chip.addEventListener('click', onClick);
  return chip;
}

function renderSeasons() {
  teaSeasonsBox.innerHTML = '';
  for (const group of seasonTree) {
    const chip = makeChip(group.season, () => selectSeason(group.season));
    chip.setAttribute('aria-pressed', String(group.season === selectedSeason));
    teaSeasonsBox.appendChild(chip);
  }
}

function renderSituations() {
  teaSituationsBox.innerHTML = '';
  const group = seasonTree.find((g) => g.season === selectedSeason);
  if (!group) return;

  const all = makeChip('상황 무관', () => selectSituation(null));
  all.setAttribute('aria-pressed', String(selectedSituation === null));
  teaSituationsBox.appendChild(all);

  for (const item of group.situations) {
    const chip = makeChip(item.situation, () => selectSituation(item.situation));
    chip.setAttribute('aria-pressed', String(item.situation === selectedSituation));
    chip.title = `${item.mood} · ${item.count}건`;
    teaSituationsBox.appendChild(chip);
  }
}

function renderMood() {
  const group = seasonTree.find((g) => g.season === selectedSeason);
  const item = group?.situations.find((s) => s.situation === selectedSituation);
  if (!item) {
    teaMoodText.hidden = true;
    return;
  }
  teaMoodText.textContent = `${item.mood} — "${item.moment}" (${item.count}건)`;
  teaMoodText.hidden = false;
}

function selectSeason(season) {
  selectedSeason = season;
  selectedSituation = null;
  renderSeasons();
  renderSituations();
  renderMood();
}

function selectSituation(situation) {
  selectedSituation = situation;
  renderSituations();
  renderMood();
}

function showPickError(message) {
  teaPickError.textContent = message;
  teaPickError.hidden = false;
}

function fillPreview(candidate, today) {
  currentCandidate = candidate;
  for (const field of TEA_FIELDS) {
    teaFieldEl[field].textContent = candidate[field] || '';
  }
  teaCardDate.textContent = formatDisplayDate(today);
  teaSourceText.textContent = `추천풀 No.${candidate.no} · ${candidate.situation}`;
  teaPreviewWrap.hidden = false;
  teaPublishResult.textContent = '';
}

async function pickCandidate() {
  teaPickError.hidden = true;
  teaPickBtn.disabled = true;
  teaRepickBtn.disabled = true;

  const params = new URLSearchParams();
  if (selectedSeason) params.set('season', selectedSeason);
  if (selectedSituation) params.set('situation', selectedSituation);
  if (seenNos.length) params.set('exclude', seenNos.join(','));

  try {
    const res = await fetch(`/api/teas/pool/pick?${params}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || '후보를 가져오지 못했습니다.');

    seenNos.push(json.candidate.no);
    if (seenNos.length > 40) seenNos.shift();
    fillPreview(json.candidate, json.today);
  } catch (err) {
    showPickError(err.message);
  } finally {
    teaPickBtn.disabled = false;
    teaRepickBtn.disabled = false;
  }
}

teaPickBtn.addEventListener('click', pickCandidate);
teaRepickBtn.addEventListener('click', pickCandidate);

teaPublishBtn.addEventListener('click', async () => {
  if (!currentCandidate) return;

  const edited = {};
  for (const field of TEA_FIELDS) {
    edited[field] = teaFieldEl[field].textContent.trim();
  }

  const empty = TEA_FIELDS.filter((f) => !edited[f]).map((f) => teaFieldEl[f].dataset.label);
  if (empty.length) {
    teaPublishResult.textContent = `${empty.join(', ')} 항목이 비어 있습니다.`;
    teaPublishResult.className = 'result result--error';
    return;
  }

  teaPublishBtn.disabled = true;
  teaRepickBtn.disabled = true;
  teaPublishResult.className = 'result';
  teaPublishResult.textContent = '등록 중...';

  try {
    const res = await fetch('/api/teas/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        no: currentCandidate.no,
        season: currentCandidate.season,
        situation: currentCandidate.situation,
        mood: currentCandidate.mood,
        ...edited,
      }),
    });
    const json = await res.json();

    if (!json.ok) {
      teaPublishResult.className = 'result result--error';
      teaPublishResult.textContent = `실패: ${json.error}`;
      return;
    }

    const notes = [`${json.date} 오늘의 차로 등록했습니다. 1~2분 후 사이트에 반영됩니다.`];
    if (!json.poolUpdated) notes.push(`다만 추천풀 엑셀 저장은 실패했습니다 — ${json.poolError}`);
    if (json.includedSources?.length) {
      notes.push(`수정된 소스도 함께 올렸습니다: ${json.includedSources.join(', ')}`);
    }
    // 함께 싣지 않은 src/ 변경이 남아 있으면 빌드가 깨질 수 있으니 눈에 띄게 알린다.
    if (json.otherDirtySources?.length) {
      notes.push(`⚠ 아직 커밋되지 않은 소스가 있습니다 — ${json.otherDirtySources.join(', ')}. 이 파일들 때문에 배포가 실패할 수 있습니다.`);
    }

    teaPublishResult.className = json.otherDirtySources?.length ? 'result result--warn' : 'result result--ok';
    teaPublishResult.textContent = notes.join('\n');
  } catch (err) {
    teaPublishResult.className = 'result result--error';
    teaPublishResult.textContent = `실패: ${err.message}`;
  } finally {
    teaPublishBtn.disabled = false;
    teaRepickBtn.disabled = false;
  }
});

// ---- 초기 로드: 계절·상황 목록을 추천풀에서 읽어온다 ----

(async () => {
  try {
    const res = await fetch('/api/teas/pool/situations');
    const json = await res.json();
    if (json.ok === false) throw new Error(json.error);

    seasonTree = json.seasons || [];
    if (seasonTree.length === 0) {
      showPickError('추천풀이 비어 있습니다.');
      return;
    }
    // 오늘 계절이 추천풀에 있으면 그걸 기본 선택 — 가장 흔한 사용 흐름을 한 번에 줄여준다.
    const month = new Date().getMonth() + 1;
    const todaySeason =
      month >= 3 && month <= 5 ? '봄' : month >= 6 && month <= 8 ? '여름' : month >= 9 && month <= 11 ? '가을' : '겨울';
    selectSeason(seasonTree.some((g) => g.season === todaySeason) ? todaySeason : seasonTree[0].season);
  } catch (err) {
    showPickError(`추천풀을 읽지 못했습니다: ${err.message}`);
  }
})();
