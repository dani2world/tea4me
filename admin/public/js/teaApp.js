// ---- 오늘의 차 등록 파이프라인 ----
// src/lib/todayTea.ts의 CATEGORY_LABELS와 값을 맞춰둔 것 — 어드민(CommonJS)과
// 프런트(Astro/TS) 사이엔 공유 import 경로가 없어 값만 중복해서 유지한다.
const TEA_CATEGORY_LABELS = {
  intro: '도입부 (계절/날씨 담은 여운 있는 한 줄)',
  whyPicked: '왜 이 차를 골랐냐면',
  goodPoints: '이 차, 이런 점이 좋아요',
  howToBrew: '이렇게 마시면 더 좋아요',
  snackPairing: '이 차엔 이런 다식이 잘 어울려요',
  comfortMessage: '오늘의 위로',
};

const TEA_STAGE_LABEL = {
  queued: '대기 중...',
  drafting: 'AI가 후보 문구를 쓰는 중...',
  ready: '후보 문구가 준비됐습니다. 검토 후 등록하세요.',
  published: '등록 완료!',
  error: '오류가 발생했습니다.',
};

const teaForm = document.getElementById('tea-form');
const teaGenerateBtn = document.getElementById('tea-generate-btn');
const teaProgressBox = document.getElementById('tea-progress');
const teaProgressText = document.getElementById('tea-progress-text');
const teaEditorBox = document.getElementById('tea-editor');
const teaCandidatesBox = document.getElementById('tea-candidates');
const teaSlugInput = document.getElementById('tea-slug');
const teaPublishBtn = document.getElementById('tea-publish-btn');
const teaPublishResult = document.getElementById('tea-publish-result');

let currentTeaPostId = null;
let teaPollTimer = null;

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((el) => el.value);
}

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

teaForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('tea-name').value.trim();
  const category = document.getElementById('tea-category').value.trim();
  const seasons = checkedValues('tea-season');
  const weatherTags = checkedValues('tea-weather');
  const selectedCategories = checkedValues('tea-cat');

  if (!name || selectedCategories.length === 0) {
    alert('이름과 문구를 생성할 항목을 최소 1개 선택해주세요.');
    return;
  }

  teaGenerateBtn.disabled = true;
  teaProgressBox.hidden = false;
  teaEditorBox.hidden = true;
  teaProgressText.textContent = '요청 중...';

  try {
    const res = await fetch('/api/teas/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, seasons, weatherTags, selectedCategories }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || '생성 요청 실패');
    currentTeaPostId = json.postId;
    pollTeaStatus();
  } catch (err) {
    teaProgressText.textContent = `실패: ${err.message}`;
    teaGenerateBtn.disabled = false;
  }
});

function pollTeaStatus() {
  clearInterval(teaPollTimer);
  teaPollTimer = setInterval(async () => {
    const res = await fetch(`/api/teas/${currentTeaPostId}/status`);
    const status = await res.json();
    teaProgressText.textContent = `${TEA_STAGE_LABEL[status.stage] || status.stage} (${status.progress || 0}%)`;

    if (status.stage === 'ready') {
      clearInterval(teaPollTimer);
      teaGenerateBtn.disabled = false;
      await loadTeaEditor();
    } else if (status.stage === 'error') {
      clearInterval(teaPollTimer);
      teaGenerateBtn.disabled = false;
      teaProgressText.textContent = `오류: ${status.error}`;
    }
  }, 2000);
}

async function loadTeaEditor() {
  const res = await fetch(`/api/teas/${currentTeaPostId}`);
  const content = await res.json();

  teaCandidatesBox.innerHTML = '';
  const candidates = content.candidates || {};
  for (const [key, lines] of Object.entries(candidates)) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'field';
    fieldset.dataset.category = key;

    const legend = document.createElement('legend');
    legend.textContent = TEA_CATEGORY_LABELS[key] || key;
    fieldset.appendChild(legend);

    lines.forEach((line, i) => {
      const row = document.createElement('label');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.style.alignItems = 'center';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = i === 0; // 기본으로 첫 번째 후보만 체크
      checkbox.className = 'tea-candidate-checkbox';

      const text = document.createElement('input');
      text.type = 'text';
      text.value = line;
      text.className = 'tea-candidate-text';
      text.style.flex = '1';

      row.appendChild(checkbox);
      row.appendChild(text);
      fieldset.appendChild(row);
    });

    teaCandidatesBox.appendChild(fieldset);
  }

  teaSlugInput.value = content.slug || slugify(content.name || '');
  teaEditorBox.hidden = false;
}

teaPublishBtn.addEventListener('click', async () => {
  teaPublishBtn.disabled = true;
  teaPublishResult.textContent = '저장 중...';

  const finalLines = {};
  teaCandidatesBox.querySelectorAll('fieldset[data-category]').forEach((fieldset) => {
    const key = fieldset.dataset.category;
    const lines = [];
    fieldset.querySelectorAll('label').forEach((row) => {
      const checkbox = row.querySelector('.tea-candidate-checkbox');
      const text = row.querySelector('.tea-candidate-text');
      if (checkbox.checked && text.value.trim()) lines.push(text.value.trim());
    });
    finalLines[key] = lines;
  });

  const patch = { ...finalLines, slug: teaSlugInput.value.trim() };

  try {
    await fetch(`/api/teas/${currentTeaPostId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    teaPublishResult.textContent = '등록 중...';
    const res = await fetch(`/api/teas/${currentTeaPostId}/publish`, { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      teaPublishResult.textContent = `등록 완료: ${json.slug} (1~2분 후 사이트에 반영됩니다)`;
    } else {
      teaPublishResult.textContent = `실패: ${json.error}`;
    }
  } catch (err) {
    teaPublishResult.textContent = `실패: ${err.message}`;
  } finally {
    teaPublishBtn.disabled = false;
  }
});

// ---- 페이지를 새로 열어도 대기 중인 초안을 이어서 편집할 수 있게 자동으로 불러오기 ----

(async () => {
  const res = await fetch('/api/teas/pending');
  const { postId } = await res.json();
  if (postId) {
    currentTeaPostId = postId;
    await loadTeaEditor();
  }
})();
