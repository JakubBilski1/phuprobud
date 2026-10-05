// robots.txt. Niczego nie blokujemy: adres demo i panel /admin/ sa wylaczone z wyszukiwarek
// przez noindex, a robot musi moc wejsc na strone, zeby ten noindex zobaczyc.
import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const tekst = `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`;
  return new Response(tekst, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
