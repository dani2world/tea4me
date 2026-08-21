// 순수 함수만 — Astro frontmatter(빌드 시점, Node)와 클라이언트 <script type="module">
// 양쪽에서 그대로 import해서 쓴다. 외부 의존성 없음.

export interface TeaEntry {
  slug: string;
  name: string;
  date: string;
  season: '봄' | '여름' | '가을' | '겨울' | '전체';
  situation?: string;
  mood?: string;
  message: string;
  brewingTip: string;
  pairing: string;
  moment: string;
  sourceNo?: number;
  draft?: boolean;
}

/** KST(Asia/Seoul) 기준 'YYYY-MM-DD'. en-CA 로케일이 그 순서로 그대로 출력되는 걸 이용. */
export function getKSTDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

/** 'YYYY-MM-DD' -> '8월 21일 금요일'. dateStr을 UTC 자정으로 해석해 요일을 계산하므로
 * (순수 달력 날짜 연산) 실행 환경의 로컬 타임존과 무관하게 항상 같은 요일이 나온다. */
export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = WEEKDAYS_KO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 ${weekday}요일`;
}

export function getSeasonKST(dateStr: string): '봄' | '여름' | '가을' | '겨울' {
  const month = Number(dateStr.slice(5, 7));
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

// djb2 — 결정적, 의존성 없음, 짧은 문자열에서도 분포가 고르게 퍼진다.
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * 그날 보여줄 항목 하나를 고른다.
 *
 * 1. 그 날짜로 등록된 항목이 있으면 그것. 어드민에서 방금 등록한 차가 바로 노출된다.
 * 2. 없으면 같은 계절의 과거 등록분에서 날짜 해시로 하나 — 등록을 건너뛴 날에도
 *    카드가 비지 않는다. 같은 날짜엔 항상 같은 결과가 나오므로 리빌드와 무관하다.
 * 3. 그 계절 항목이 하나도 없으면 전체 등록분으로 폴백.
 */
export function pickTodayTea(catalog: TeaEntry[], dateStr: string): TeaEntry | null {
  const live = catalog.filter((t) => !t.draft);
  if (live.length === 0) return null;

  const pinned = live.find((t) => t.date === dateStr);
  if (pinned) return pinned;

  const season = getSeasonKST(dateStr);
  const seasonal = live.filter((t) => t.season === season || t.season === '전체');
  const pool = seasonal.length > 0 ? seasonal : live;

  return pool[hashString(dateStr) % pool.length];
}
