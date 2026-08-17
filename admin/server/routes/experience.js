const express = require('express');
const multer = require('multer');
const fs = require('node:fs');
const path = require('node:path');
const { postWorkDir } = require('../paths');
const { newPostId, readStatus, readContent, writeContent, writeStatus } = require('../services/postStore');
const { runExperiencePipeline } = require('../services/experiencePipeline');
const { writePost } = require('../services/markdownWriter');
const { publish } = require('../services/gitPublisher');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!req.postId) req.postId = newPostId();
    const dir = path.join(postWorkDir(req.postId), 'original_images');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const EDITABLE_FIELDS = ['title', 'category', 'tags', 'excerpt', 'body', 'coverImageAlt', 'humanNote'];

router.post('/', upload.array('photos', 10), (req, res) => {
  const memo = (req.body.memo || '').trim();
  if (!req.files?.length || !memo) {
    return res.status(400).json({ ok: false, error: '사진과 메모를 모두 입력해주세요.' });
  }

  const postId = req.postId;
  const photoFilenames = req.files.map((f) => f.originalname);

  fs.writeFileSync(
    path.join(postWorkDir(postId), 'input.json'),
    JSON.stringify({ memo, photoFilenames, createdAt: new Date().toISOString() }, null, 2),
  );
  writeStatus(postId, { stage: 'uploaded', progress: 5 });

  runExperiencePipeline({ postId, memo, photoFilenames });

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
  if (!content.title || !content.body || !content.coverImageAlt) {
    return res.status(400).json({ ok: false, error: '제목/본문/대체텍스트가 비어 있습니다.' });
  }

  try {
    const humanNote = (content.humanNote || '').trim();
    const data = {
      title: content.title,
      slug: content.slug,
      pubDate: new Date().toISOString().slice(0, 10),
      type: 'experience',
      category: content.category,
      tags: content.tags || [],
      excerpt: content.excerpt,
      coverImage: './cover.jpg',
      coverImageAlt: content.coverImageAlt,
      author: '티소믈리에',
      ...(humanNote ? { humanNote } : {}),
    };
    const body = humanNote ? `${content.body}\n\n티소믈리에의 한마디: ${humanNote}` : content.body;
    const coverImageSourcePath = path.join(postWorkDir(postId), 'edited_images', 'cover.jpg');

    const { postDir } = writePost({ data, body, coverImageSourcePath });
    await publish({ postDir, message: `경험/리뷰 글 발행: ${data.title}` });

    writeStatus(postId, { stage: 'published', progress: 100 });
    res.json({ ok: true, slug: data.slug });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
