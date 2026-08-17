const express = require('express');
const path = require('node:path');
const { postWorkDir } = require('../paths');
const { newPostId, readStatus, readContent, writeContent, writeStatus } = require('../services/postStore');
const { runInfoPipeline } = require('../services/infoPipeline');
const { writePost } = require('../services/markdownWriter');
const { publish } = require('../services/gitPublisher');

const router = express.Router();

// coverImageAttribution·slug는 AI/Pexels가 정한 값 그대로 유지 — 사람이 편집하는 건
// 글의 내용/태그/한마디뿐이다.
const EDITABLE_FIELDS = ['title', 'category', 'tags', 'excerpt', 'body', 'coverImageAlt', 'humanNote'];

router.post('/generate', (req, res) => {
  const postId = newPostId();
  postWorkDir(postId);
  writeStatus(postId, { stage: 'queued', progress: 0 });

  runInfoPipeline({ postId });

  res.json({ ok: true, postId });
});

router.get('/:id/status', (req, res) => {
  res.json(readStatus(req.params.id));
});

router.get('/:id', (req, res) => {
  const content = readContent(req.params.id);
  if (!content) return res.status(404).json({ ok: false, error: '아직 초안이 준비되지 않았습니다.' });
  res.json(content);
});

router.patch('/:id', (req, res) => {
  const current = readContent(req.params.id) || {};
  const patch = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in req.body) patch[key] = req.body[key];
  }
  writeContent(req.params.id, { ...current, ...patch });
  res.json({ ok: true });
});

router.post('/:id/publish', async (req, res) => {
  const postId = req.params.id;
  const content = readContent(postId);
  if (!content) return res.status(404).json({ ok: false, error: '초안을 찾을 수 없습니다.' });

  const humanNote = (content.humanNote || '').trim();
  if (!humanNote) {
    return res.status(400).json({
      ok: false,
      error: '정보성 글은 "나의 한마디"를 직접 작성해야 발행할 수 있습니다.',
    });
  }
  if (!content.title || !content.body || !content.coverImageAlt || !content.coverImageAttribution) {
    return res.status(400).json({ ok: false, error: '제목/본문/표지 이미지 정보가 비어 있습니다.' });
  }

  try {
    const data = {
      title: content.title,
      slug: content.slug,
      pubDate: new Date().toISOString().slice(0, 10),
      type: 'info',
      category: content.category,
      tags: content.tags || [],
      excerpt: content.excerpt,
      coverImage: './cover.jpg',
      coverImageAlt: content.coverImageAlt,
      coverImageAttribution: content.coverImageAttribution,
      author: '티소믈리에',
      humanNote,
    };
    const body = `${content.body}\n\n티소믈리에의 한마디: ${humanNote}`;
    const coverImageSourcePath = path.join(postWorkDir(postId), 'edited_images', 'cover.jpg');

    const { postDir } = writePost({ data, body, coverImageSourcePath });
    await publish({ postDir, message: `정보성 글 발행: ${data.title}` });

    writeStatus(postId, { stage: 'published', progress: 100 });
    res.json({ ok: true, slug: data.slug });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
