import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: 'posts/*/index.md', base: './src/content' }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().min(1).max(80),
        slug: z.string().min(1),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),

        // 정보성(자동생성) | 경험/리뷰(수동)
        type: z.enum(['info', 'experience']),
        category: z.string().min(1),
        tags: z.array(z.string()).default([]),
        excerpt: z.string().min(1).max(200),

        coverImage: image(),
        coverImageAlt: z.string().min(1),
        // 홈 카드 목록에서 8:5로 크롭할 때 피사체가 잘리지 않게 하는 기준점.
        // 상세 페이지에서는 크롭하지 않고 원본 비율 그대로 보여준다.
        coverImageFocalPoint: z
          .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
          .default({ x: 0.5, y: 0.5 }),
        // 정보성 글의 스톡 이미지에만 필요 (경험 글은 본인 사진이라 해당 없음)
        coverImageAttribution: z
          .object({
            photographer: z.string(),
            photographerUrl: z.string().url(),
            source: z.enum(['pexels', 'unsplash']),
            sourceUrl: z.string().url(),
          })
          .optional(),

        author: z.string().default('티소믈리에'),
        // 한마디 인용구 위에 보여줄 핵심 요약 박스 (2~4개 항목). 주로 정보성 글에 사용.
        keyTakeaways: z.array(z.string()).optional(),
        // 운영자가 직접 쓴 한 문장 — 정보성 글의 발행 게이트 근거
        humanNote: z.string().optional(),
        draft: z.boolean().default(false),
      })
      .refine((d) => d.type !== 'info' || (!!d.humanNote && d.humanNote.trim().length > 0), {
        message: '정보성 글(type: "info")은 humanNote(직접 작성한 한 문장)가 반드시 있어야 합니다.',
      })
      .refine((d) => d.type !== 'info' || !!d.coverImageAttribution, {
        message: '정보성 글의 표지 이미지는 coverImageAttribution(출처 표기)이 필요합니다.',
      }),
});

// "오늘의 차" 카드 한 장 = 이 컬렉션의 항목 하나.
// 어드민의 추천풀(admin/data/todayTeaPool.xlsx)에서 골라 등록하면 여기에 쌓인다.
// 등록 시 그날 날짜(date)에 고정되고, 등록을 건너뛴 날은 같은 계절의 과거 등록분에서
// 자동으로 하나가 뽑힌다 — src/lib/todayTea.ts의 pickTodayTea() 참고.
const teas = defineCollection({
  loader: file('src/content/teas/teas.yaml'),
  schema: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    // 이 항목이 "오늘의 차"로 고정 노출될 날짜 (KST, YYYY-MM-DD)
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    season: z.enum(['봄', '여름', '가을', '겨울', '전체']).default('전체'),
    // 추천풀의 "상황·시기"/"오늘의 분위기". 카드에는 안 나오지만 폴백 선택과
    // 어드민에서 어떤 조건으로 고른 항목인지 되짚는 데 쓴다.
    situation: z.string().optional(),
    mood: z.string().optional(),
    // 카드 본문 — 그날의 분위기와 차의 특징을 잇는 한 문장
    message: z.string().min(1),
    brewingTip: z.string().min(1), // 예: "90~95℃ · 3분"
    pairing: z.string().min(1), // 예: "레몬 마들렌"
    moment: z.string().min(1), // 예: "답답한 마음을 환기하고 싶은 오후"
    // 되돌아가 고칠 수 있게 남겨두는 추천풀 행 번호
    sourceNo: z.number().int().positive().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, teas };
