export type PostType = 'info' | 'review' | 'reflection';

export const POST_TYPE_LABEL: Record<PostType, string> = {
  info: '차 이야기',
  review: 'Review',
  reflection: '차후감',
};

export const POST_TYPES: PostType[] = ['info', 'review', 'reflection'];
