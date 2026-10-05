// Zmiana hasla panelu: wymaga sesji i obecnego hasla. Po zmianie pozostale sesje sa zamykane.
import type { APIRoute } from 'astro';
import { adresKlienta, blokada, zmienHaslo } from '../../../server/konto';
import { blad, json, trescJson, wymagajSesji } from '../../../server/odpowiedzi';
import { MIN_DLUGOSC_HASLA } from '../../../lib/nadpisania';

export const prerender = false;

export const POST: APIRoute = async (kontekst) => {
  const odmowa = await wymagajSesji(kontekst);
  if (odmowa) return odmowa;
  if (blokada(adresKlienta(kontekst.request))) return blad(429, 'Za dużo nieudanych prób. Spróbuj ponownie później.');

  const dane = await trescJson(kontekst.request);
  const obecne = String(dane?.obecne ?? '').slice(0, 200);
  const nowe = String(dane?.nowe ?? '');
  if (nowe.length < MIN_DLUGOSC_HASLA) return blad(400, `Nowe hasło musi mieć co najmniej ${MIN_DLUGOSC_HASLA} znaków.`);
  if (nowe.length > 200) return blad(400, 'Nowe hasło jest za długie.');
  if (nowe === obecne) return blad(400, 'Nowe hasło jest takie samo jak obecne.');
  if ((await zmienHaslo(obecne, nowe, kontekst.cookies)) !== 'ok') return blad(400, 'Obecne hasło jest nieprawidłowe.');
  return json({ ok: true });
};
