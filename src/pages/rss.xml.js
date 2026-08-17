import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  return rss({
    title: 'TEA for ME',
    description: '차에 관한 이야기와 직접 마셔본 차의 기록, 그리고 차를 마시며 만난 순간들을 담습니다.',
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
