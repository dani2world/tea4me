// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';

// https://astro.build/config
export default defineConfig({
  site: 'https://dani2world.github.io',
  base: '/tea4me',
  integrations: [sitemap()],
  markdown: {
    // GFM 취소선(~text~)이 본문 중 "8~18%"처럼 물결표시(~)가 두 번 나오는
    // 문장 사이를 취소선으로 잘못 묶는 문제 때문에 GFM을 끔. 이 블로그는
    // 표/각주/체크리스트/취소선을 쓰지 않으므로 부작용 없음.
    processor: satteri({ features: { gfm: false } }),
  },
});
