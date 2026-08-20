const express = require('express');
const { postWorkDir, CONTENT_TEAS_FILE } = require('../paths');
const {
  newPostId,
  readStatus,
  readContent,
  writeContent,
  writeStatus,
  findLatestReadyPost,
} = require('../services/postStore');
const { runTeaDraft } = require('../services/teaPipeline');
const { readCatalog, writeTea } = require('../services/teaWriter');
const { publish } = require('../services/gitPublisher');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(readCatalog());
});

router.post('/generate', (req, res) => {
  const { name, category, seasons, weatherTags, selectedCategories } = req.body;
  if (!name || !selectedCategories?.length) {
    return res.status(400).json({ ok: false, error: '이름과 최소 1개 카테고리가 필요합니다.' });
  }
  const postId = newPostId();
  postWorkDir(postId);
  writeStatus(postId, { kind: 'tea', stage: 'queued', progress: 0 });
  runTeaDraft({ postId, name, category, seasons, weatherTags, selectedCategories });
  res.json({ ok: true, postId });
});

router.get('/pending', (req, res) => {
  res.json({ postId: findLatestReadyPost('tea') });
});

router.get('/:id/status', (req, res) => {
  res.json(readStatus(req.params.id));
});

router.get('/:id', (req, res) => {
  const content = readContent(req.params.id);
  if (!content) return res.status(404).json({ ok: false, error: '아직 초안이 준비되지 않았습니다.' });
  res.json(content);
});

// 후보 중 운영자가 고른/수정한 최종 문구로 덮어쓰기
router.patch('/:id', (req, res) => {
  const current = readContent(req.params.id) || {};
  writeContent(req.params.id, { ...current, ...req.body });
  res.json({ ok: true });
});

router.post('/:id/publish', async (req, res) => {
  const content = readContent(req.params.id);
  if (!content) return res.status(404).json({ ok: false, error: '초안을 찾을 수 없습니다.' });

  const slug = (content.slug || '').trim();
  if (!slug || !content.name) {
    return res.status(400).json({ ok: false, error: '슬러그와 이름이 필요합니다.' });
  }

  const intro = content.intro || [];
  if (intro.length === 0) {
    return res.status(400).json({ ok: false, error: '"intro" 문구가 최소 1개 있어야 합니다.' });
  }

  const entry = {
    slug,
    name: content.name,
    category: content.category,
    seasons: content.seasons?.length ? content.seasons : ['전체'],
    weatherTags: content.weatherTags || [],
    intro,
    whyPicked: content.whyPicked || [],
    goodPoints: content.goodPoints || [],
    howToBrew: content.howToBrew || [],
    snackPairing: content.snackPairing || [],
    comfortMessage: content.comfortMessage || [],
  };

  const hasAnyLine = [
    entry.whyPicked,
    entry.goodPoints,
    entry.howToBrew,
    entry.snackPairing,
    entry.comfortMessage,
  ].some((arr) => arr.length > 0);
  if (!hasAnyLine) {
    return res.status(400).json({ ok: false, error: '적어도 하나의 카테고리에는 문구가 있어야 합니다.' });
  }

  try {
    writeTea(entry);
    await publish({ postDir: CONTENT_TEAS_FILE, message: `오늘의 차 등록: ${entry.name}` });
    writeStatus(req.params.id, { stage: 'published', progress: 100 });
    res.json({ ok: true, slug });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
