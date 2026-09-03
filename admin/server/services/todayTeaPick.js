// src/lib/todayTea.ts 의 순수 함수(getSeasonKST, hashString, pickTodayTea)를 그대로 옮긴 것.
// admin 서버는 CommonJS라 .ts를 직접 require할 수 없어 여기 복제해 둔다 —
// "오늘의 차" 폴백 규칙을 바꾸면 반드시 두 파일을 함께 고칠 것.

function getSeasonKST(dateStr) {
  const month = Number(dateStr.slice(5, 7));
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickTodayTea(catalog, dateStr) {
  const live = catalog.filter((t) => !t.draft);
  if (live.length === 0) return null;

  const pinned = live.find((t) => t.date === dateStr);
  if (pinned) return pinned;

  const season = getSeasonKST(dateStr);
  const seasonal = live.filter((t) => t.season === season || t.season === '전체');
  const pool = seasonal.length > 0 ? seasonal : live;

  return pool[hashString(dateStr) % pool.length];
}

module.exports = { getSeasonKST, hashString, pickTodayTea };
