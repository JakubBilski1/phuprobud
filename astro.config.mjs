import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://phuprobud.pl',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  // Strony sa renderowane na serwerze ze zmianami z panelu /admin/ (baza); panel, 404
  // i pliki konfiguracyjne buduja sie statycznie (export const prerender = true).
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Zdjecia sa gotowe w repozytorium (scripts/obrazy.mjs), serwer ich nie przetwarza.
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  // Pochodzenie zadan do API sprawdza src/middleware.ts: wbudowana kontrola porownuje protokol,
  // a serwer za proxy widzi http zamiast https.
  security: { checkOrigin: false },
  // Serwer w jednym pakiecie, bez node_modules w obrazie: mniejszy obraz i szybszy start.
  vite: { ssr: { noExternal: true } },
});
