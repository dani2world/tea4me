const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { runClaudeJson } = require('./claudeRunner');

const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';

function pexelsSearch(query, perPage = 6) {
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

function buildVettingPrompt(filename) {
  return `Read 도구로 "${filename}" 이미지를 열어보세요 (현재 작업 폴더에 있습니다).
이 이미지에 다음 중 하나라도 해당하면 사용할 수 없습니다:
- 식별 가능한 사람의 얼굴이 나온다 (초상권 문제)
- 워터마크, 로고, 텍스트 오버레이가 찍혀 있다

다음 JSON 스키마로만 응답하세요 (다른 텍스트 없이):
{ "usable": true 또는 false, "reason": "판단 이유 한 줄" }`;
}

/**
 * 검색어로 Pexels 후보 이미지들을 순서대로 내려받아, 얼굴/워터마크가 없는
 * 첫 번째 이미지를 채택한다 (초상권·저작권 문제 회피). cwd는 claude가
 * Read 도구로 후보 파일을 열어볼 수 있는 폴더여야 하고, finalFilename은
 * 그 폴더 안에서 채택된 이미지가 최종적으로 저장될 파일명이다.
 */
async function searchAndDownloadVetted({ query, cwd, finalFilename }) {
  const result = await pexelsSearch(query);
  const candidates = result.photos || [];
  if (!candidates.length) {
    throw new Error(`"${query}"에 대한 Pexels 검색 결과가 없습니다.`);
  }

  for (let i = 0; i < candidates.length; i++) {
    const photo = candidates[i];
    const candidateFilename = `_candidate-${Date.now()}-${i}.jpg`;
    const candidatePath = path.join(cwd, candidateFilename);

    await downloadImage(photo.src.large2x || photo.src.large, candidatePath);
    const verdict = await runClaudeJson({ cwd, prompt: buildVettingPrompt(candidateFilename) });

    if (verdict.usable) {
      const finalPath = path.join(cwd, finalFilename);
      fs.renameSync(candidatePath, finalPath);
      return {
        path: finalPath,
        attribution: {
          photographer: photo.photographer,
          photographerUrl: photo.photographer_url,
          source: 'pexels',
          sourceUrl: photo.url,
        },
      };
    }
    fs.unlinkSync(candidatePath);
  }

  throw new Error(`"${query}"에 대해 얼굴/워터마크 없는 이미지를 찾지 못했습니다.`);
}

module.exports = { searchAndDownloadVetted };
