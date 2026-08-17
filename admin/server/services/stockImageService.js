const https = require('node:https');
const fs = require('node:fs');

const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';

function pexelsSearch(query, perPage = 5) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
      return reject(new Error('PEXELS_API_KEY가 설정되어 있지 않습니다 (admin/.env 확인).'));
    }
    const url = `${PEXELS_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
    https
      .get(url, { headers: { Authorization: apiKey } }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`Pexels API 오류 (${res.statusCode}): ${body.slice(0, 300)}`));
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(new Error('Pexels 응답을 파싱하지 못했습니다.'));
          }
        });
      })
      .on('error', reject);
  });
}

function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`이미지 다운로드 실패 (${res.statusCode})`));
        }
        const file = fs.createWriteStream(outputPath);
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(outputPath)));
        file.on('error', reject);
      })
      .on('error', reject);
  });
}

/**
 * 검색어로 Pexels에서 무료 이미지를 검색해 다운로드하고, 출처 표기 정보를 반환한다.
 * (Unsplash와 달리 사용마다 별도 다운로드-추적 API 호출이 필요 없어 관리가 단순함)
 */
async function searchAndDownload(query, outputPath) {
  const result = await pexelsSearch(query);
  const photo = result.photos?.[0];
  if (!photo) throw new Error(`"${query}"에 대한 Pexels 검색 결과가 없습니다.`);

  await downloadImage(photo.src.large2x || photo.src.large, outputPath);

  return {
    photographer: photo.photographer,
    photographerUrl: photo.photographer_url,
    source: 'pexels',
    sourceUrl: photo.url,
  };
}

module.exports = { searchAndDownload };
