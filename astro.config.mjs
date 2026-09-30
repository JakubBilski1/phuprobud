import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://phuprobud.pbdevs.com',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
