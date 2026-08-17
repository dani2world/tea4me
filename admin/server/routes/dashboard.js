const express = require('express');
const fs = require('node:fs');
const { DATA_POSTS_DIR } = require('../paths');
const { readStatus, readContent } = require('../services/postStore');

const router = express.Router();

// 경험/리뷰 글이 준비돼 있으면 그것을 우선 발행하고, 없는 날만 정보성 글로
// 공백을 채운다는 발행 우선순위를 화면에 그대로 반영한다. 스케줄러는 없음 —
// 항상 사람이 이 추천을 보고 직접 클릭한다.
router.get('/today', (req, res) => {
  if (!fs.existsSync(DATA_POSTS_DIR)) {
    return res.json({ recommendation: 'info', readyExperiencePosts: [] });
  }

  const postIds = fs
    .readdirSync(DATA_POSTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const readyExperiencePosts = postIds
    .map((id) => ({ id, status: readStatus(id) }))
    .filter(({ status }) => status.kind === 'experience' && status.stage === 'ready')
    .map(({ id, status }) => {
      const content = readContent(id);
      return { postId: id, title: content?.title || '(제목 없음)', updatedAt: status.updatedAt };
    });

  res.json({
    recommendation: readyExperiencePosts.length > 0 ? 'experience' : 'info',
    readyExperiencePosts,
  });
});

module.exports = router;
