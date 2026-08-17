// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://dani2world.github.io',
  base: '/tea4me',
  integrations: [sitemap()],
});
