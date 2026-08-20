const { runClaudeJson } = require('./claudeRunner');
const { writeStatus, writeContent } = require('./postStore');
const { readCatalog } = require('./teaWriter');
const { ANTI_AI_STYLE_GUIDE, TONE_GUIDE } = require('./styleGuide');

// src/lib/todayTea.ts의 CATEGORY_LABELS와 같은 키 집합 — 프런트(Astro/TS)와
// 어드민(CommonJS/Node)이 번들 경계가 달라 공유 import는 못 하고 값만 맞춰둔다.
const CATEGORY_PROMPT_LABELS = {
  whyPicked: '왜 이 차를 골랐는지',
  goodPoints: '이 차의 어떤 점이 좋은지',
  howToBrew: '어떻게 마시면 더 좋은지 (우리는 법/온도/페어링 팁)',
  snackPairing: '어떤 다식과 어울리는지',
  comfortMessage: '오늘 하루를 보내는 사람에게 건네는 위로 한마디',
};

function buildTeaDraftPrompt({ name, category, seasons, selectedCategories, existingCatalog }) {
  const covered = existingCatalog.length
    ? existingCatalog.map((t) => `- ${t.name} (${(t.seasons || []).join('/')})`).join('\n')
    : '(아직 없음)';

  const categoryAsks = selectedCategories
    .map((key) => `- "${key}": ${CATEGORY_PROMPT_LABELS[key]} — 후보 2~3개, 각 1~2문장`)
    .join('\n');

  return `당신은 '차로 하루를 편집하는 사람'이라는 차(Tea) 블로그의 에디터입니다.
홈페이지에 매일 하나씩 노출되는 "오늘의 차" 위젯에 쓸 짧은 문구를 씁니다.

[이미 등록된 차 목록]
${covered}

[이번에 문구를 쓸 차]
이름: ${name}
카테고리: ${category || '(미지정)'}
어울리는 계절: ${(seasons || []).join(', ') || '전체'}

[써야 할 카테고리별 후보 문구]
${categoryAsks}

${TONE_GUIDE}

${ANTI_AI_STYLE_GUIDE}

[중요] 이 문구는 블로그 본문이 아니라 홈페이지에 그대로 노출되는 짧은 한 줄입니다.
마크다운을 렌더링하지 않으므로 **볼드**, <u>밑줄</u> 같은 마크다운/HTML 문법을 절대
쓰지 마세요 — 그냥 일반 텍스트로만 작성하세요.

다음 JSON 스키마로만 응답하세요 (요청된 카테고리 키만 포함, 각 값은 문자열 배열):
{ ${selectedCategories.map((k) => `"${k}": ["...", "..."]`).join(', ')} }`;
}

async function runTeaDraft({ postId, name, category, seasons, weatherTags, selectedCategories }) {
  try {
    writeStatus(postId, { kind: 'tea', stage: 'drafting', progress: 30 });
    const existingCatalog = readCatalog();
    const draft = await runClaudeJson({
      cwd: process.cwd(),
      prompt: buildTeaDraftPrompt({ name, category, seasons, selectedCategories, existingCatalog }),
    });

    writeContent(postId, {
      name,
      category,
      seasons,
      weatherTags: weatherTags || [],
      candidates: draft, // { whyPicked: [...], goodPoints: [...] } — 요청한 카테고리만
    });
    writeStatus(postId, { stage: 'ready', progress: 100 });
  } catch (err) {
    writeStatus(postId, { stage: 'error', error: err.message });
  }
}

module.exports = { runTeaDraft };
