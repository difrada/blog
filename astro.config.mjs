import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// IMPORTANTE: Cambia esto por tu dominio real cuando lo tengas
export default defineConfig({
  site: 'https://tu-dominio.com',
  integrations: [
    sitemap(),
    mdx(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
