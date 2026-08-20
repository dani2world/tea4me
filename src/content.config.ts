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

const teaLines = z.array(z.string().min(1)).default([]);

const teas = defineCollection({
  loader: file('src/content/teas/teas.yaml'),
  schema: z
    .object({
      slug: z.string().min(1),
      name: z.string().min(1),
      category: z.string().optional(),
      seasons: z.array(z.enum(['봄', '여름', '가을', '겨울', '전체'])).min(1).default(['전체']),
      // v1 선택 로직은 이 필드를 쓰지 않는다 — 나중에 실시간 날씨 연동 시
      // 카탈로그를 다시 쓰지 않고 바로 쓰기 위해 스키마만 미리 마련해둔다.
      weatherTags: z.array(z.enum(['rainy', 'snowy', 'hot', 'cold', 'humid'])).default([]),
      whyPicked: teaLines, // 왜 골랐는지
      goodPoints: teaLines, // 어떤점이 좋은지
      howToBrew: teaLines, // 어떻게 마시면 더 좋은지
      snackPairing: teaLines, // 어울리는 다식
      comfortMessage: teaLines, // 그 날의 위로글
      draft: z.boolean().default(false),
    })
    .refine(
      (d) =>
        [d.whyPicked, d.goodPoints, d.howToBrew, d.snackPairing, d.comfortMessage].some(
          (arr) => arr.length > 0,
        ),
      { message: '적어도 하나의 카테고리에는 문구가 있어야 합니다.' },
    ),
});

export const collections = { posts, teas };
