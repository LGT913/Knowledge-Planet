import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  site: 'https://knowledge-planet.pages.dev',
  devToolbar: { enabled: false },
  integrations: [vue()],
  markdown: {
    shikiConfig: { theme: 'github-dark', wrap: true },
  },
});
