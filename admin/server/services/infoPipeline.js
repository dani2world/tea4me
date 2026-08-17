const fs = require('node:fs');
const path = require('node:path');
const { postWorkDir } = require('../paths');
const { runClaudeJson } = require('./claudeRunner');
const { processImage } = require('./imageProcessor');
const { searchAndDownload } = require('./stockImageService');
const { writeStatus, writeContent } = require('./postStore');
const { listPublishedPosts } = require('./topicRegistry');
const { ANTI_AI_STYLE_GUIDE } = require('./styleGuide');

const CATEGORIES = ['녹차', '홍차', '우롱차', '보이차·흑차', '백차', '다구·브루잉', '티하우스 리뷰'];

function buildTopicDraftPrompt(publishedPosts) {
  const covered = publishedPosts.length
    ? publishedPosts.map((p) => `- [${p.category}] ${p.title}`).join('\n')
    : '(아직 없음)';

  return `당신은 '차로 하루를 편집하는 사람'이라는 차(Tea) 블로그의 에디터입니다.
티 소믈리에 자격을 가진 운영자를 대신해, 차에 대한 일반 지식/정보를 다루는
정보성 글을 씁니다. 담담하고 절제된 톤, 동양철학적 사유를 곁들이되 과장·클릭베이트
금지. 이미 다룬 주제와 겹치지 않는 새 주제를 스스로 고르세요.

[이미 발행된 글 목록 - 이 주제들과 겹치지 않게 고르세요]
${covered}

작업:
1. 아직 다루지 않은 차 관련 주제를 하나 고르세요 (다음 카테고리 중에서:
   ${CATEGORIES.join(', ')}).
2. 그 주제로 블로그 글 전체를 당신의 지식을 바탕으로 작성하세요. 문단은 3~5개,
   각 문단은 빈 줄로 구분. 확인되지 않은 사실을 단정적으로 말하지 마세요. 독자에게
   말을 건네는 정중한 "~습니다"체를 기본으로 쓰되, "~거든요, ~인데요, ~하고요" 같은
   어미도 섞어서 모든 문장이 기계적으로 "~습니다"로만 끝나지 않게 하세요. 예외나
   변수가 있다면 숨기지 말고 언급하세요 (모든 걸 깔끔한 정답처럼 말하지 말 것).
3. 표지 이미지를 구할 영문 검색어(Pexels 스톡 사진 검색용, 2~4단어, 예:
   "green tea leaves close up")를 함께 제시하세요.

${ANTI_AI_STYLE_GUIDE}

다음 JSON 스키마로만 응답하세요 (다른 텍스트 없이):
{
  "title": "글 제목 (80자 이내)",
  "slug": "영문 kebab-case 짧은 슬러그",
  "category": "카테고리",
  "tags": ["태그1", "태그2", "태그3"],
  "excerpt": "200자 이내 요약",
  "body": "마크다운 본문 (문단 사이 빈 줄)",
  "coverImageQuery": "Pexels 검색용 영문 키워드",
  "coverImageAlt": "표지 이미지 대체 텍스트"
}`;
}

function buildFocalPrompt(photoFilename) {
  return `Read 도구로 "${photoFilename}" 이미지를 열어보세요 (현재 작업 폴더에 있습니다).
이 사진을 8:5 가로 비율로 크롭할 때, 가장 중요한 피사체가 잘리지 않도록 하는
포커스 포인트를 0~1 비율 좌표로 알려주세요.

다음 JSON 스키마로만 응답하세요:
{ "x": 0.5, "y": 0.5 }`;
}

function buildReviewPrompt(body) {
  return `아래는 차 블로그에 실릴 정보성 글 초안입니다. 100% AI가 작성한 글이라 AI 티가
가장 나기 쉬운 콘텐츠입니다. 편집자 입장에서 AI가 쓴 티가 나는 부분을 찾아 고치는 게
이번 작업의 핵심입니다. 사실관계는 바꾸지 말고 문체만 다듬으세요.

${ANTI_AI_STYLE_GUIDE}

위 기준에 걸리는 문장이 하나라도 있으면 반드시 고치세요. 특히 정보성 글은 "첫째/둘째",
깔끔한 요약형 결론으로 흐르기 쉬우니 더 엄격하게 점검하세요.

[초안]
${body}

다음 JSON 스키마로만 응답하세요:
{ "body": "다듬어진 마크다운 본문" }`;
}

async function runInfoPipeline({ postId }) {
  const dir = postWorkDir(postId);
  const originalDir = path.join(dir, 'original_images');
  const editedDir = path.join(dir, 'edited_images');
  fs.mkdirSync(originalDir, { recursive: true });
  fs.mkdirSync(editedDir, { recursive: true });

  try {
    writeStatus(postId, { stage: 'selecting_topic', progress: 15 });
    const publishedPosts = listPublishedPosts();
    const draft = await runClaudeJson({ cwd: dir, prompt: buildTopicDraftPrompt(publishedPosts) });

    writeStatus(postId, { stage: 'sourcing_image', progress: 40 });
    const coverOriginal = path.join(originalDir, 'cover-source.jpg');
    const attribution = await searchAndDownload(draft.coverImageQuery, coverOriginal);

    writeStatus(postId, { stage: 'planning_image', progress: 55 });
    const focal = await runClaudeJson({ cwd: originalDir, prompt: buildFocalPrompt('cover-source.jpg') });

    writeStatus(postId, { stage: 'editing_image', progress: 65 });
    await processImage({
      inputPath: coverOriginal,
      outputPath: path.join(editedDir, 'cover.jpg'),
      focal,
    });

    writeStatus(postId, { stage: 'reviewing', progress: 85 });
    const reviewed = await runClaudeJson({ cwd: dir, prompt: buildReviewPrompt(draft.body) });

    writeContent(postId, {
      title: draft.title,
      slug: draft.slug,
      category: draft.category,
      tags: draft.tags || [],
      excerpt: draft.excerpt,
      body: reviewed.body || draft.body,
      coverImageAlt: draft.coverImageAlt,
      coverImageAttribution: attribution,
      humanNote: '',
    });
    writeStatus(postId, { stage: 'ready', progress: 100 });
  } catch (err) {
    writeStatus(postId, { stage: 'error', error: err.message });
  }
}

module.exports = { runInfoPipeline };
