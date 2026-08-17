const sharp = require('sharp');
// Windows에서 sharp가 입력 파일 핸들을 캐시에 붙잡고 있어서 처리 직후 unlink 시
// EBUSY가 나는 경우가 있음 -> 캐시를 꺼서 처리 끝나면 바로 핸들을 놓게 함
sharp.cache(false);

const DEFAULT_MAX_WIDTH = 1600;

/**
 * EXIF 회전을 반영하고 폭 상한선에 맞춰 리사이즈만 한다 (크롭 없음).
 * 원본 비율은 그대로 유지 — 상세 페이지에서 원본 비율로 보여주기 위함.
 * 홈 카드 목록에서의 크롭은 focal point 기반 CSS(object-position)가 담당한다.
 */
async function processImage({ inputPath, outputPath, maxWidth = DEFAULT_MAX_WIDTH }) {
  await sharp(inputPath)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
  return outputPath;
}

module.exports = { processImage };
