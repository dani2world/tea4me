const fs = require('node:fs');
const path = require('node:path');
const { postWorkDir } = require('../paths');
const { runClaudeJson } = require('./claudeRunner');
const { processImage } = require('./imageProcessor');
const { writeStatus, writeContent } = require('./postStore');
const { ANTI_AI_STYLE_GUIDE, TONE_GUIDE } = require('./styleGuide');

const CATEGORIES = ['녹차', '홍차', '우롱차', '보이차·흑차', '백차', '다구·브루잉', '티하우스 리뷰'];

function buildDraftPrompt({ memo, photoFilenames }) {
  return `당신은 '차로 하루를 편집하는 사람'이라는 차(Tea) 블로그의 에디터입니다.
운영자(티 소믈리에)가 직접 겪은 경험/리뷰 글의 재료를 아래에 전달합니다.

[운영자 메모]
${memo}

[업로드된 사진 파일명]
${photoFilenames.map((f) => `- ${f}`).join('\n')}

작업:
1. Read 도구로 위 사진 파일들을 실제로 열어서 내용을 확인하세요 (현재 작업 폴더에 있습니다).
2. 메모와 사진 내용을 바탕으로 블로그 글 전체를 작성하세요. 담담하고 차분한 1인칭 에세이 톤,
   과장된 감탄사나 광고 문구 없이. 문단은 3~5개, 각 문단은 빈 줄로 구분.
3. 사진 중 글의 표지로 가장 적합한 사진 하나를 고르세요.
4. 카테고리는 다음 중 가장 알맞은 것을 고르세요: ${CATEGORIES.join(', ')} (없으면 새로 짧게 짓기).

${TONE_GUIDE}

${ANTI_AI_STYLE_GUIDE}

다음 JSON 스키마로만 응답하세요 (다른 텍스트 없이):
{
  "title": "글 제목 (80자 이내)",
  "slug": "영문 kebab-case 짧은 슬러그 (예: baekcha-gaeul-ohu)",
  "category": "카테고리",
  "tags": ["태그1", "태그2", "태그3"],
  "excerpt": "200자 이내 요약 (카드 목록에 노출됨)",
  "body": "마크다운 본문 (문단 사이 빈 줄)",
  "coverPhoto": "표지로 고른 사진의 정확한 파일명",
  "coverImageAlt": "표지 이미지 대체 텍스트"
}`;
}

function buildFocalPrompt(photoFilename) {
  return `Read 도구로 "${photoFilename}" 사진을 열어보세요 (현재 작업 폴더에 있습니다).
이 사진이 홈 화면 카드 목록에서 8:5 가로 비율로 크롭되어 보일 때, 가장 중요한
피사체가 잘리지 않도록 하는 포커스 포인트를 0~1 비율 좌표로 알려주세요.

다음 JSON 스키마로만 응답하세요:
{ "x": 0.5, "y": 0.5 }`;
}

function buildReviewPrompt(body) {
  return `아래는 차 블로그에 실릴 경험/리뷰 글 초안입니다. 편집자 입장에서 AI가 쓴 티가
나는 부분을 찾아 고치는 게 이번 작업의 핵심입니다. 내용과 사실관계는 바꾸지 말고,
문체만 다듬으세요.

${TONE_GUIDE}

${ANTI_AI_STYLE_GUIDE}

위 기준에 걸리는 문장이 하나라도 있으면 반드시 고치세요. 문단 하나하나를 검토하면서
"이 문장, AI가 쓴 것처럼 매끈하고 뻔하지 않은가?"를 스스로 점검하고 고치세요. 존댓말과
반말이 한 문단 안에서 섞여 있지 않은지 특히 꼼꼼히 확인하세요.

[초안]
${body}

다음 JSON 스키마로만 응답하세요:
{ "body": "다듬어진 마크다운 본문" }`;
}

async function runExperiencePipeline({ postId, memo, photoFilenames }) {
  const dir = postWorkDir(postId);
  const originalDir = path.join(dir, 'original_images');
  const editedDir = path.join(dir, 'edited_images');
  fs.mkdirSync(editedDir, { recursive: true });

  try {
    writeStatus(postId, { stage: 'analyzing', progress: 15 });
    const draft = await runClaudeJson({ cwd: originalDir, prompt: buildDraftPrompt({ memo, photoFilenames }) });

    writeStatus(postId, { stage: 'planning_image', progress: 45 });
    const focal = await runClaudeJson({ cwd: originalDir, prompt: buildFocalPrompt(draft.coverPhoto) });

    writeStatus(postId, { stage: 'editing_image', progress: 60 });
    await processImage({
      inputPath: path.join(originalDir, draft.coverPhoto),
      outputPath: path.join(editedDir, 'cover.jpg'),
    });

    writeStatus(postId, { stage: 'reviewing', progress: 80 });
    const reviewed = await runClaudeJson({ cwd: originalDir, prompt: buildReviewPrompt(draft.body) });

    writeContent(postId, {
      title: draft.title,
      slug: draft.slug,
      category: draft.category,
      tags: draft.tags || [],
      excerpt: draft.excerpt,
      body: reviewed.body || draft.body,
      coverImageAlt: draft.coverImageAlt,
      coverImageFocalPoint: focal,
      humanNote: '',
    });
    writeStatus(postId, { stage: 'ready', progress: 100 });
  } catch (err) {
    writeStatus(postId, { stage: 'error', error: err.message });
  }
}

module.exports = { runExperiencePipeline };
