import type { APIRoute } from 'astro';
import { maBaze } from '../../../server/baza';
import { zamknijSesje } from '../../../server/konto';
import { json } from '../../../server/odpowiedzi';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  if (maBaze()) await zamknijSesje(cookies);
  return json({ ok: true });
};
