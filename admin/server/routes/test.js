const express = require('express');
const path = require('node:path');
const { REPO_ROOT } = require('../paths');
const { writePost } = require('../services/markdownWriter');
const { publish } = require('../services/gitPublisher');

const router = express.Router();

// 발행 파이프라인(마크다운 생성 → git commit → push) 배관 자체가 동작하는지
// 확인하기 위한 임시 테스트 라우트. 경험/정보성 글 파이프라인이 붙기 전
// 단계에서만 사용.
router.post('/test-publish', async (req, res) => {
  try {
    const data = {
      title: '관리자 앱 발행 테스트',
      slug: 'admin-test-publish',
      pubDate: new Date().toISOString().slice(0, 10),
      type: 'experience',
      category: '테스트',
      tags: ['테스트'],
      excerpt: '관리자 웹앱에서 git push 파이프라인이 정상 동작하는지 확인하기 위한 테스트 글입니다.',
      coverImage: './cover.jpg',
      coverImageAlt: '테스트 커버 이미지',
      author: '티소믈리에',
    };
    const body =
      '이 글은 관리자 웹앱의 발행 파이프라인(마크다운 생성 → git commit → push)이 정상 작동하는지 확인하기 위해 자동으로 생성되었습니다.';
    const coverImageSourcePath = path.join(
      REPO_ROOT,
      'src',
      'content',
      'posts',
      'baekcha-ilocha-gaeul',
      'cover.jpg',
    );

    const { postDir } = writePost({ data, body, coverImageSourcePath });
    await publish({ postDir, message: '테스트: 관리자 앱 발행 파이프라인 확인' });

    res.json({ ok: true, slug: data.slug });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
