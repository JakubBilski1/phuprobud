// Logowanie do panelu, krok 2: kod z e-maila. Dobry kod otwiera sesje (ciasteczko HttpOnly).
// 410 oznacza, ze kod wygasl, zostal uzyty albo wyczerpal limit prob: trzeba zaczac od hasla.
import type { APIRoute } from 'astro';
import { maBaze } from '../../../server/baza';
import { adresKlienta, blokada, sprawdzKod } from '../../../server/konto';
import { blad, json, trescJson } from '../../../server/odpowiedzi';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!maBaze()) return blad(503, 'Panel nie jest podłączony do bazy danych.');
  const adres = adresKlienta(request);
  const czekaj = blokada(adres);
  if (czekaj) return blad(429, `Za dużo nieudanych prób. Spróbuj ponownie za ${Math.ceil(czekaj / 60)} min.`);

  const dane = await trescJson(request);
  const kod = String(dane?.kod ?? '').replace(/\s/g, '').slice(0, 12);
  try {
    const wynik = await sprawdzKod(kod, cookies, adres);
    if (wynik === 'ok') return json({ ok: true });
    if (wynik === 'zly') return blad(401, 'Nieprawidłowy kod. Sprawdź e-mail i wpisz go jeszcze raz.');
    return blad(410, 'Kod wygasł albo wpisano go za dużo razy. Zaloguj się ponownie, żeby dostać nowy.');
  } catch (e) {
    console.error('[panel] kod logowania:', e instanceof Error ? e.message : e);
    return blad(503, 'Baza danych nie odpowiada. Spróbuj ponownie za chwilę.');
  }
};
