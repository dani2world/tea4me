import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: '차로 하루를 편집하는 사람',
    description: '티 소믈리에가 동양철학과 개인적 시선으로 재구성한 차 이야기',
    site: context.site,
    trailingSlash: false,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.excerpt,
      link: `/tea4me/posts/${post.id}`,
      categories: [post.data.category, ...post.data.tags],
    })),
  });
}
