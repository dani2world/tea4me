// "차 취향 찾기" 질문·선택지·결과 매핑.
//
// 이 파일 하나만 고치면 질문/선택지/추천 차를 바꿀 수 있습니다.
// - QUESTIONS: 질문 5개. 각 선택지의 `vote`가 아래 RESULTS의 id를 가리킵니다.
// - RESULTS: 추천 결과 6종. `category`는 src/content/posts의 실제 category 값과
//   같아야 "함께 읽어보세요"에 관련 글이 붙습니다(다르면 빈 채로 보여집니다).
// - 매핑 규칙(어떤 선택지가 어떤 결과에 투표하는지)은 처음 잡아본 값이라
//   자유롭게 재배치해도 됩니다 — scoreAnswers()가 단순 다수결이라 안전합니다.

export interface QuizOption {
  id: string;
  text: string;
  sub: string;
  vote: string; // RESULTS의 id
}

export interface QuizQuestion {
  id: string;
  axisLabel: string;
  question: string; // <br> 허용
  options: QuizOption[];
}

export interface QuizResult {
  id: string;
  name: string;
  desc: string;
  quote: string;
  temp: string;
  time: string;
  leaf: string;
  pairing: string;
  category: string; // src/content/posts의 category 값과 매칭
}

export const QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    axisLabel: '오늘의 온도',
    question: '지금 창밖은 어떤 날씨인가요?',
    options: [
      { id: 'q1-rain', text: '비', sub: '촉촉하고 조용한 날', vote: 'baekcha' },
      { id: 'q1-sun', text: '맑음', sub: '빛이 잘 드는 날', vote: 'nokcha' },
      { id: 'q1-hot', text: '더움', sub: '시원한 게 필요한 날', vote: 'herb' },
      { id: 'q1-cold', text: '추움', sub: '손을 데우고 싶은 날', vote: 'hongcha' },
    ],
  },
  {
    id: 'q2',
    axisLabel: '맛',
    question: '단맛과 쌉쌀함,<br>어느 쪽에 손이 가세요?',
    options: [
      { id: 'q2-sweet-strong', text: '확실한 단맛', sub: '달콤한 쪽이 좋아요', vote: 'herb' },
      { id: 'q2-sweet-mild', text: '은은한 단맛', sub: '살짝 달면 충분해요', vote: 'baekcha' },
      { id: 'q2-bitter-mild', text: '쌉쌀함 살짝', sub: '떫은맛도 매력이죠', vote: 'oolong' },
      { id: 'q2-bitter-strong', text: '진한 쌉쌀함', sub: '깊고 진한 게 좋아요', vote: 'puerh' },
    ],
  },
  {
    id: 'q3',
    axisLabel: '카페인',
    question: '지금 카페인, 괜찮으세요?',
    options: [
      { id: 'q3-plenty', text: '얼마든지', sub: '진한 한 잔도 좋아요', vote: 'hongcha' },
      { id: 'q3-little', text: '조금만', sub: '가볍게 마시고 싶어요', vote: 'oolong' },
      { id: 'q3-none', text: '없는 게 좋아요', sub: '허브차 쪽으로', vote: 'herb' },
    ],
  },
  {
    id: 'q4',
    axisLabel: '시간',
    question: '차를 마시는 시간은<br>주로 언제인가요?',
    options: [
      { id: 'q4-morning', text: '아침', sub: '하루를 깨우는 시간', vote: 'nokcha' },
      { id: 'q4-afternoon', text: '오후', sub: '잠깐의 여유', vote: 'oolong' },
      { id: 'q4-evening', text: '저녁', sub: '하루를 정리하는 시간', vote: 'puerh' },
      { id: 'q4-before-bed', text: '자기 전', sub: '마음을 가라앉히고 싶을 때', vote: 'herb' },
    ],
  },
  {
    id: 'q5',
    axisLabel: '곁에',
    question: '한 잔 옆에<br>무엇을 두고 싶으세요?',
    options: [
      { id: 'q5-dessert', text: '달콤한 디저트', sub: '케이크나 쿠키 한 조각', vote: 'herb' },
      { id: 'q5-snack', text: '담백한 다식', sub: '양갱이나 견과류', vote: 'baekcha' },
      { id: 'q5-book', text: '책 한 권', sub: '조용히 몰입하고 싶을 때', vote: 'puerh' },
      { id: 'q5-music', text: '조용한 음악', sub: '멍하니 흘려듣고 싶을 때', vote: 'oolong' },
    ],
  },
];

export const RESULTS: QuizResult[] = [
  {
    id: 'baekcha',
    name: '백모단',
    desc: '부드럽고 은은한 단맛이 도는 차입니다. 조용한 날, 가볍게 여러 번 우려 마시기 좋아요.',
    quote: '부드럽지만 심심하지 않은 한 잔을 찾는 분',
    temp: '85℃ 안팎',
    time: '3분',
    leaf: '3g / 200ml',
    pairing: '담백한 다식',
    category: '백차',
  },
  {
    id: 'nokcha',
    name: '벽라춘',
    desc: '싱그러운 꽃향과 산뜻한 감칠맛이 특징입니다. 빛이 잘 드는 날 아침에 잘 어울려요.',
    quote: '가볍지만 또렷하게 하루를 시작하고 싶은 분',
    temp: '70~80℃',
    time: '1~1.5분',
    leaf: '3g / 150ml',
    pairing: '양갱',
    category: '녹차',
  },
  {
    id: 'hongcha',
    name: '아쌈 정통 잎차',
    desc: '진하고 힘 있는 맛이 특징인 홍차입니다. 우유를 더해도, 스트레이트로 마셔도 잘 어울려요.',
    quote: '진하고 확실한 한 잔이 필요한 분',
    temp: '95℃',
    time: '3분',
    leaf: '3g / 200ml',
    pairing: '버터 쿠키',
    category: '홍차',
  },
  {
    id: 'oolong',
    name: '동방미인',
    desc: '홍차에 가까운 산화도에 꿀 같은 단향이 겹치는 우롱차입니다. 조용한 오후에 잘 어울려요.',
    quote: '부드럽지만 심심하지 않은 한 잔을 찾는 분',
    temp: '85~90℃',
    time: '2~3분',
    leaf: '4g / 200ml',
    pairing: '버터 쿠키',
    category: '우롱차',
  },
  {
    id: 'puerh',
    name: '보이차 (숙차)',
    desc: '깊고 진한 발효 향이 특징입니다. 추운 날 저녁, 책과 함께 천천히 마시기 좋아요.',
    quote: '깊고 진한 한 잔에 하루를 정리하고 싶은 분',
    temp: '95~100℃',
    time: '2~3분(세차 후)',
    leaf: '5g / 200ml',
    pairing: '견과류',
    category: '보이차·흑차',
  },
  {
    id: 'herb',
    name: '카모마일',
    desc: '카페인 없이 은은한 단맛과 꽃향을 즐길 수 있어요. 자기 전, 마음을 가라앉히고 싶을 때.',
    quote: '카페인 없이도 충분히 위로가 되는 한 잔을 찾는 분',
    temp: '90~95℃',
    time: '4~5분',
    leaf: '2g / 200ml',
    pairing: '달콤한 디저트',
    category: '서양·글로벌 티 문화',
  },
];

/** 5개 답(각 옵션 id)의 vote를 집계해 가장 많이 나온 결과 id를 돌려준다.
 * 동점이면 RESULTS에 먼저 나온 쪽을 택한다(항상 같은 입력 -> 같은 결과). */
export function scoreAnswers(optionIds: string[]): string {
  const votes = new Map<string, number>();
  for (const q of QUESTIONS) {
    const picked = q.options.find((o) => optionIds.includes(o.id));
    if (!picked) continue;
    votes.set(picked.vote, (votes.get(picked.vote) ?? 0) + 1);
  }

  let bestId = RESULTS[0].id;
  let bestScore = -1;
  for (const result of RESULTS) {
    const score = votes.get(result.id) ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestId = result.id;
    }
  }
  return bestId;
}
