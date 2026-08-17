import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

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

export const collections = { posts };
