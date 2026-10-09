// Zmiana hasla panelu: wymaga sesji i obecnego hasla. Po zmianie pozostale sesje sa zamykane.
import type { APIRoute } from 'astro';
import { adresKlienta, blokada, odnotujNieudana, uzytkownikSesji, zmienHaslo } from '../../../server/konto';
import { blad, json, trescJson, wymagajSesji } from '../../../server/odpowiedzi';
import { MIN_DLUGOSC_HASLA } from '../../../lib/nadpisania';

export const prerender = false;

export const POST: APIRoute = async (kontekst) => {
  const odmowa = await wymagajSesji(kontekst, { hasloStartowe: true });
  if (odmowa) return odmowa;
  if (blokada(adresKlienta(kontekst.request))) return blad(429, 'Za dużo nieudanych prób. Spróbuj ponownie później.');

  const dane = await trescJson(kontekst.request);
  const obecne = String(dane?.obecne ?? '').slice(0, 200);
  const nowe = String(dane?.nowe ?? '');
  if (nowe.length < MIN_DLUGOSC_HASLA) return blad(400, `Nowe hasło musi mieć co najmniej ${MIN_DLUGOSC_HASLA} znaków.`);
  if (nowe.length > 200) return blad(400, 'Nowe hasło jest za długie.');
  if (nowe === obecne) return blad(400, 'Nowe hasło jest takie samo jak obecne.');
  const u = await uzytkownikSesji(kontekst.cookies);
  if (!u) return blad(401, 'Sesja wygasła. Zaloguj się ponownie.');
  const wynik = await zmienHaslo(u, obecne, nowe, kontekst.cookies);
  if (wynik === 'startowe') return blad(400, 'Nowe hasło musi być inne niż hasło startowe.');
  if (wynik !== 'ok') {
    odnotujNieudana(adresKlienta(kontekst.request));
    return blad(400, 'Obecne hasło jest nieprawidłowe.');
  }
  return json({ ok: true });
};
