import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';

export default defineConfig({
  site: 'https://knowledge-planet.pages.dev',
  devToolbar: { enabled: false },
  integrations: [vue()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
      // 笔记里存在 Shiki 未内置的语言标记，统一映射到最接近的已支持语言，
      // 避免构建日志刷出 [Shiki] The language "xxx" doesn't exist。
      langAlias: {
        mysql: 'sql',
        'xml-dtd': 'xml',
        dtd: 'xml',
        jsp: 'html',
        redis: 'bash',
        'a.txt': 'plaintext',
        text: 'plaintext',
        plain: 'plaintext',
        'c++': 'cpp',
        yacas: 'plaintext',
        Java: 'java',
        Plain: 'plaintext',
        private: 'plaintext',
      },
      transformers: [
        {
          line(node, line) {
            node.children.unshift({
              type: 'element',
              tagName: 'span',
              properties: { class: 'code-line-no', 'aria-hidden': 'true' },
              children: [{ type: 'text', value: String(line) }],
            });
          },
        },
      ],
    },
  },
});
