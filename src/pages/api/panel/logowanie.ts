// Logowanie do panelu: sprawdza login i haslo na serwerze i otwiera sesje (ciasteczko HttpOnly).
import type { APIRoute } from 'astro';
import { maBaze } from '../../../server/baza';
import { adresKlienta, blokada, otworzSesje, sprawdzLogowanie } from '../../../server/konto';
import { blad, json, trescJson } from '../../../server/odpowiedzi';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!maBaze()) return blad(503, 'Panel nie jest podłączony do bazy danych.');
  const adres = adresKlienta(request);
  const czekaj = blokada(adres);
  if (czekaj) return blad(429, `Za dużo nieudanych prób. Spróbuj ponownie za ${Math.ceil(czekaj / 60)} min.`);

  const dane = await trescJson(request);
  const login = String(dane?.login ?? '').trim().slice(0, 100);
  const haslo = String(dane?.haslo ?? '').slice(0, 200);
  try {
    const k = await sprawdzLogowanie(login, haslo, adres);
    if (!k) return blad(401, 'Nieprawidłowy login lub hasło.');
    await otworzSesje(cookies);
    return json({ ok: true });
  } catch (e) {
    console.error('[panel] logowanie:', e instanceof Error ? e.message : e);
    return blad(503, 'Baza danych nie odpowiada. Spróbuj ponownie za chwilę.');
  }
};
