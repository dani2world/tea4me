const sharp = require('sharp');
// Windows에서 sharp가 입력 파일 핸들을 캐시에 붙잡고 있어서 처리 직후 unlink 시
// EBUSY가 나는 경우가 있음 -> 캐시를 꺼서 처리 끝나면 바로 핸들을 놓게 함
sharp.cache(false);

// 표지 이미지는 홈 카드(8:5)·본문 히어로(8:5) 어디서나 같은 비율로 쓰이므로
// 크롭 단계에서 8:5로 맞춰두면 astro:assets가 그 위에서 webp 변환·반응형만 처리하면 됨.
const DEFAULT_ASPECT = [8, 5];
const DEFAULT_TARGET_WIDTH = 1600;

/** EXIF 회전을 실제 픽셀에 반영한 정규화된 이미지 버퍼를 반환 */
async function getNormalizedBuffer(inputPath) {
  const { data, info } = await sharp(inputPath).rotate().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * focal(포커스 포인트, 0~1 비율)을 중심으로 aspect(가로:세로) 비율에 맞는 크롭 박스를 계산.
 * aspect가 없으면 크롭 없이 원본 비율을 그대로 유지.
 */
function computeCropBox({ width, height, focal, aspect }) {
  if (!aspect || !aspect[0] || !aspect[1]) return null;

  const targetRatio = aspect[0] / aspect[1];
  const currentRatio = width / height;

  let cropWidth = width;
  let cropHeight = height;
  if (currentRatio > targetRatio) {
    cropWidth = Math.round(height * targetRatio);
  } else {
    cropHeight = Math.round(width / targetRatio);
  }

  const fx = typeof focal?.x === 'number' ? focal.x : 0.5;
  const fy = typeof focal?.y === 'number' ? focal.y : 0.5;

  let left = Math.round(fx * width - cropWidth / 2);
  let top = Math.round(fy * height - cropHeight / 2);
  left = Math.max(0, Math.min(left, width - cropWidth));
  top = Math.max(0, Math.min(top, height - cropHeight));

  return { left, top, width: cropWidth, height: cropHeight };
}

/**
 * 이미지를 focal point 기준으로 크롭하고 표준 폭으로 리사이즈해서 저장.
 * @param {object} opts
 * @param {string} opts.inputPath
 * @param {string} opts.outputPath
 * @param {{x:number,y:number}} [opts.focal] - 0~1 비율의 포커스 포인트
 * @param {[number,number]} [opts.aspect] - 목표 가로:세로 비율 (기본 8:5)
 * @param {number} [opts.targetWidth]
 */
async function processImage({ inputPath, outputPath, focal, aspect = DEFAULT_ASPECT, targetWidth = DEFAULT_TARGET_WIDTH }) {
  const { data, width, height } = await getNormalizedBuffer(inputPath);
  let pipeline = sharp(data);

  const box = computeCropBox({ width, height, focal, aspect });
  if (box) pipeline = pipeline.extract(box);

  pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: true }).jpeg({ quality: 85 });
  await pipeline.toFile(outputPath);
  return outputPath;
}

module.exports = { processImage };
