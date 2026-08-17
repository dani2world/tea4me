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
    } else {
      publishResult.textContent = `실패: ${json.error}`;
    }
  } catch (err) {
    publishResult.textContent = `실패: ${err.message}`;
  } finally {
    publishBtn.disabled = false;
  }
});
