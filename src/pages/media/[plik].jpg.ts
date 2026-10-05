// Zdjecia wgrane w panelu, podawane z bazy: /media/<id>.jpg (pelne) i /media/<id>-m.jpg (miniatura).
// Identyfikator jest losowy i zdjecie pod nim sie nie zmienia, wiec przegladarka moze je trzymac rok.
import type { APIRoute } from 'astro';
import { maBaze, sql } from '../../server/baza';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  // Rozszerzenie jest w nazwie pliku trasy: adres z rozszerzeniem nie dostaje wymuszonego ukosnika na koncu.
  const dopasowanie = /^([a-f0-9]{24})(-m)?$/.exec(params.plik ?? '');
  if (!dopasowanie || !maBaze()) return new Response(null, { status: 404 });
  const kolumna = dopasowanie[2] ? 'mini' : 'pelne';
  const [wiersz] = await sql<{ dane: Buffer }>(`select ${kolumna} as dane from panel_zdjecia where id = $1`, [dopasowanie[1]]);
  if (!wiersz) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(wiersz.dane), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(wiersz.dane.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
