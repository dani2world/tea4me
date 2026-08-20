// 순수 함수만 — Astro frontmatter(빌드 시점, Node)와 클라이언트 <script type="module">
// 양쪽에서 그대로 import해서 쓴다. 외부 의존성 없음.

export type TeaCategory = 'whyPicked' | 'goodPoints' | 'howToBrew' | 'snackPairing' | 'comfortMessage';

export const CATEGORY_LABELS: Record<TeaCategory, string> = {
  whyPicked: '왜 이 차를 골랐냐면',
  goodPoints: '이 차, 이런 점이 좋아요',
  howToBrew: '이렇게 마시면 더 좋아요',
  snackPairing: '이 차엔 이런 다식이 잘 어울려요',
  comfortMessage: '오늘의 위로',
};

const CATEGORY_KEYS: TeaCategory[] = [
  'whyPicked',
  'goodPoints',
  'howToBrew',
  'snackPairing',
  'comfortMessage',
];

export interface TeaEntry {
  slug: string;
  name: string;
  category?: string;
  seasons: string[];
  intro: string[];
  whyPicked: string[];
  goodPoints: string[];
  howToBrew: string[];
  snackPairing: string[];
  comfortMessage: string[];
  draft?: boolean;
}

export interface TodayTeaPick {
  tea: TeaEntry;
  intro: string;
  category: TeaCategory;
  line: string;
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

/** 'YYYY-MM-DD' -> '2026. 8. 20. Thu.' 요일은 dateStr을 그대로 UTC 자정으로 해석해
 * 계산하므로(순수 달력 날짜 연산), 실행 환경의 로컬 타임존과 무관하게 항상 같은 요일이 나온다. */
export function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  return `${y}. ${m}. ${d}. ${weekday}.`;
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
 * 같은 날짜(KST)엔 항상 같은 결과, 다른 날짜엔 (결정적으로) 다른 결과를 돌려준다.
 * 리빌드나 서버 없이 클라이언트에서 "오늘의 차"를 계산하기 위한 핵심 함수.
 */
export function pickTodayTea(catalog: TeaEntry[], dateStr: string): TodayTeaPick | null {
  const live = catalog.filter((t) => !t.draft);
  if (live.length === 0) return null;

  const season = getSeasonKST(dateStr);
  let pool = live.filter((t) => t.seasons.includes(season) || t.seasons.includes('전체'));
  if (pool.length === 0) pool = live; // 계절에 맞는 항목이 없으면 전체 카탈로그로 폴백

  const tea = pool[hashString(dateStr) % pool.length];

  const availableCategories = CATEGORY_KEYS.filter((k) => tea[k].length > 0);
  if (availableCategories.length === 0 || tea.intro.length === 0) return null; // 스키마 refine/필수화로 사실상 발생 안 함

  const intro = tea.intro[hashString(`${dateStr}:${tea.slug}:intro`) % tea.intro.length];

  const category =
    availableCategories[hashString(`${dateStr}:${tea.slug}`) % availableCategories.length];
  const lines = tea[category];
  const line = lines[hashString(`${dateStr}:${tea.slug}:${category}`) % lines.length];

  return { tea, intro, category, line };
}
