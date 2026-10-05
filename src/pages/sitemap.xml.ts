// Mapa strony dla wyszukiwarek: strona glowna i katalog bez pozycji ukrytych w panelu.
// Panel /admin/ i 404 poza mapa.
import type { APIRoute } from 'astro';
import { kategorie, modele } from '../data/katalog';

export const prerender = false;

export const GET: APIRoute = ({ site }) => {
  const sciezki = ['/', '/oferta/', ...kategorie.map((k) => k.href), ...modele.map((m) => m.href)];
  const wpisy = sciezki.map((s) => `  <url><loc>${new URL(s, site).href}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${wpisy}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
