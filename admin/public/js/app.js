// ---- 오늘 글 발행 대시보드 ----

async function loadDashboardBanner() {
  const banner = document.getElementById('dashboard-banner');
  try {
    const res = await fetch('/api/dashboard/today');
    const data = await res.json();
    if (data.recommendation === 'experience') {
      const list = data.readyExperiencePosts.map((p) => `「${p.title}」`).join(', ');
      banner.innerHTML = `<strong>오늘은 준비된 경험/리뷰 글이 있습니다.</strong> ${list} — 이 글을 먼저 발행하세요.`;
    } else {
      banner.innerHTML = `<strong>준비된 경험/리뷰 글이 없습니다.</strong> 오늘은 정보성 글로 공백을 채워보세요.`;
    }
  } catch (err) {
    banner.textContent = '대시보드 정보를 불러오지 못했습니다.';
  }
}

loadDashboardBanner();

const btn = document.getElementById('test-publish-btn');
const result = document.getElementById('test-publish-result');

btn.addEventListener('click', async () => {
  btn.disabled = true;
  result.textContent = '발행 중...';
  try {
    const res = await fetch('/api/test-publish', { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      result.textContent = `발행 완료: ${json.slug} (1~2분 후 사이트에 반영됩니다)`;
    } else {
      result.textContent = `실패: ${json.error}`;
    }
  } catch (err) {
    result.textContent = `실패: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
});

// ---- 경험/리뷰 글 파이프라인 ----

const STAGE_LABEL = {
  uploaded: '업로드 완료, 대기 중...',
  analyzing: 'AI가 사진과 메모를 분석해 초안을 쓰는 중...',
  planning_image: '표지 사진 크롭 포인트를 정하는 중...',
  editing_image: '이미지를 다듬는 중...',
  reviewing: '문체를 다듬는 중...',
  ready: '초안이 준비됐습니다. 아래에서 편집 후 발행하세요.',
  published: '발행 완료!',
  error: '오류가 발생했습니다.',
};

const experienceForm = document.getElementById('experience-form');
const experienceSubmitBtn = document.getElementById('experience-submit-btn');
const progressBox = document.getElementById('experience-progress');
const progressText = document.getElementById('experience-progress-text');
const editorBox = document.getElementById('experience-editor');
const publishBtn = document.getElementById('publish-btn');
const publishResult = document.getElementById('publish-result');

let currentPostId = null;
let pollTimer = null;

experienceForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  experienceSubmitBtn.disabled = true;
  progressBox.hidden = false;
  editorBox.hidden = true;
  progressText.textContent = '업로드 중...';

  const formData = new FormData(experienceForm);

  try {
    const res = await fetch('/api/experience', { method: 'POST', body: formData });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || '업로드 실패');
    currentPostId = json.postId;
    pollStatus();
  } catch (err) {
    progressText.textContent = `실패: ${err.message}`;
    experienceSubmitBtn.disabled = false;
  }
});

function pollStatus() {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    const res = await fetch(`/api/experience/${currentPostId}/status`);
    const status = await res.json();
    progressText.textContent = `${STAGE_LABEL[status.stage] || status.stage} (${status.progress || 0}%)`;

    if (status.stage === 'ready') {
      clearInterval(pollTimer);
      experienceSubmitBtn.disabled = false;
      await loadEditor();
    } else if (status.stage === 'error') {
      clearInterval(pollTimer);
      experienceSubmitBtn.disabled = false;
      progressText.textContent = `오류: ${status.error}`;
    }
  }, 2000);
}

async function loadEditor() {
  const res = await fetch(`/api/experience/${currentPostId}`);
  const content = await res.json();

  document.getElementById('editor-cover-preview').src = `/data/posts/${currentPostId}/edited_images/cover.jpg`;
  document.getElementById('editor-title').value = content.title || '';
  document.getElementById('editor-category').value = content.category || '';
  document.getElementById('editor-tags').value = (content.tags || []).join(', ');
  document.getElementById('editor-excerpt').value = content.excerpt || '';
  document.getElementById('editor-body').value = content.body || '';
  document.getElementById('editor-alt').value = content.coverImageAlt || '';
  document.getElementById('editor-humannote').value = content.humanNote || '';

  editorBox.hidden = false;
}

// ---- 정보성 글 자동생성 파이프라인 ----

const INFO_STAGE_LABEL = {
  queued: '대기 중...',
  selecting_topic: 'AI가 아직 다루지 않은 주제를 고르고 초안을 쓰는 중...',
  sourcing_image: 'Pexels에서 표지 이미지를 찾는 중...',
  planning_image: '표지 이미지 크롭 포인트를 정하는 중...',
  editing_image: '이미지를 다듬는 중...',
  reviewing: '문체를 다듬는 중...',
  ready: '초안이 준비됐습니다. "나의 한마디"를 작성해야 발행할 수 있습니다.',
  published: '발행 완료!',
  error: '오류가 발생했습니다.',
};

const infoGenerateBtn = document.getElementById('info-generate-btn');
const infoProgressBox = document.getElementById('info-progress');
const infoProgressText = document.getElementById('info-progress-text');
const infoEditorBox = document.getElementById('info-editor');
const infoHumanNoteInput = document.getElementById('info-humannote');
const infoGateWarning = document.getElementById('info-gate-warning');
const infoPublishBtn = document.getElementById('info-publish-btn');
const infoPublishResult = document.getElementById('info-publish-result');

let currentInfoPostId = null;
let infoPollTimer = null;

infoGenerateBtn.addEventListener('click', async () => {
  infoGenerateBtn.disabled = true;
  infoProgressBox.hidden = false;
  infoEditorBox.hidden = true;
  infoProgressText.textContent = '요청 중...';

  try {
    const res = await fetch('/api/info/generate', { method: 'POST' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || '생성 요청 실패');
    currentInfoPostId = json.postId;
    pollInfoStatus();
  } catch (err) {
    infoProgressText.textContent = `실패: ${err.message}`;
    infoGenerateBtn.disabled = false;
  }
});

function pollInfoStatus() {
  clearInterval(infoPollTimer);
  infoPollTimer = setInterval(async () => {
    const res = await fetch(`/api/info/${currentInfoPostId}/status`);
    const status = await res.json();
    infoProgressText.textContent = `${INFO_STAGE_LABEL[status.stage] || status.stage} (${status.progress || 0}%)`;

    if (status.stage === 'ready') {
      clearInterval(infoPollTimer);
      infoGenerateBtn.disabled = false;
      await loadInfoEditor();
    } else if (status.stage === 'error') {
      clearInterval(infoPollTimer);
      infoGenerateBtn.disabled = false;
      infoProgressText.textContent = `오류: ${status.error}`;
    }
  }, 2000);
}

async function loadInfoEditor() {
  const res = await fetch(`/api/info/${currentInfoPostId}`);
  const content = await res.json();

  document.getElementById('info-cover-preview').src = `/data/posts/${currentInfoPostId}/edited_images/cover.jpg`;
  const attr = content.coverImageAttribution;
  document.getElementById('info-attribution').textContent = attr
    ? `Photo by ${attr.photographer} on Pexels`
    : '';
  document.getElementById('info-title').value = content.title || '';
  document.getElementById('info-category').value = content.category || '';
  document.getElementById('info-tags').value = (content.tags || []).join(', ');
  document.getElementById('info-excerpt').value = content.excerpt || '';
  document.getElementById('info-body').value = content.body || '';
  document.getElementById('info-alt').value = content.coverImageAlt || '';
  infoHumanNoteInput.value = content.humanNote || '';

  updateInfoGate();
  infoEditorBox.hidden = false;
}

function updateInfoGate() {
  const filled = infoHumanNoteInput.value.trim().length > 0;
  infoPublishBtn.disabled = !filled;
  infoGateWarning.hidden = filled;
}

infoHumanNoteInput.addEventListener('input', updateInfoGate);

infoPublishBtn.addEventListener('click', async () => {
  infoPublishBtn.disabled = true;
  infoPublishResult.textContent = '저장 중...';

  const patch = {
    title: document.getElementById('info-title').value.trim(),
    category: document.getElementById('info-category').value.trim(),
    tags: document.getElementById('info-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
    excerpt: document.getElementById('info-excerpt').value.trim(),
    body: document.getElementById('info-body').value.trim(),
    coverImageAlt: document.getElementById('info-alt').value.trim(),
    humanNote: infoHumanNoteInput.value.trim(),
  };

  try {
    await fetch(`/api/info/${currentInfoPostId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    infoPublishResult.textContent = '발행 중...';
    const res = await fetch(`/api/info/${currentInfoPostId}/publish`, { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      infoPublishResult.textContent = `발행 완료: ${json.slug} (1~2분 후 사이트에 반영됩니다)`;
      loadDashboardBanner();
    } else {
      infoPublishResult.textContent = `실패: ${json.error}`;
    }
  } catch (err) {
    infoPublishResult.textContent = `실패: ${err.message}`;
  } finally {
    updateInfoGate();
  }
});

publishBtn.addEventListener('click', async () => {
  publishBtn.disabled = true;
  publishResult.textContent = '저장 중...';

  const patch = {
    title: document.getElementById('editor-title').value.trim(),
    category: document.getElementById('editor-category').value.trim(),
    tags: document.getElementById('editor-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
    excerpt: document.getElementById('editor-excerpt').value.trim(),
    body: document.getElementById('editor-body').value.trim(),
    coverImageAlt: document.getElementById('editor-alt').value.trim(),
    humanNote: document.getElementById('editor-humannote').value.trim(),
  };

  try {
    await fetch(`/api/experience/${currentPostId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });

    publishResult.textContent = '발행 중...';
    const res = await fetch(`/api/experience/${currentPostId}/publish`, { method: 'POST' });
    const json = await res.json();
    if (json.ok) {
      publishResult.textContent = `발행 완료: ${json.slug} (1~2분 후 사이트에 반영됩니다)`;
      loadDashboardBanner();
    } else {
      publishResult.textContent = `실패: ${json.error}`;
    }
  } catch (err) {
    publishResult.textContent = `실패: ${err.message}`;
  } finally {
    publishBtn.disabled = false;
  }
});
