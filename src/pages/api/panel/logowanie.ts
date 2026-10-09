// Logowanie do panelu, krok 1: sprawdza e-mail i haslo na serwerze i wysyla 6-cyfrowy kod na ten
// e-mail. Sesja powstaje dopiero po kodzie (src/pages/api/panel/kod.ts).
import type { APIRoute } from 'astro';
import { maBaze } from '../../../server/baza';
import { KOD_MINUTY, adresKlienta, blokada, sprawdzHaslo, wyslijKodLogowania, zamaskujEmail } from '../../../server/konto';
import { BladPoczty, mozeWyslacKod } from '../../../server/poczta';
import { blad, json, trescJson } from '../../../server/odpowiedzi';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!maBaze()) return blad(503, 'Panel nie jest podłączony do bazy danych.');
  // Kod z e-maila jest obowiazkowy: bez poczty nie wpuszczamy samym haslem.
  if (!mozeWyslacKod()) return blad(503, 'Panel nie może wysłać kodu logowania, bo serwer nie ma skonfigurowanej poczty. Skontaktuj się z PB Devs.');
  const adres = adresKlienta(request);
  const czekaj = blokada(adres);
  if (czekaj) return blad(429, `Za dużo nieudanych prób. Spróbuj ponownie za ${Math.ceil(czekaj / 60)} min.`);

  const dane = await trescJson(request);
  const email = String(dane?.login ?? '').slice(0, 200);
  const haslo = String(dane?.haslo ?? '').slice(0, 200);
  try {
    const u = await sprawdzHaslo(email, haslo, adres);
    if (!u) return blad(401, 'Nieprawidłowy e-mail lub hasło.');
    const wynik = await wyslijKodLogowania(u, cookies);
    if (!wynik.wyslano) return blad(429, `Kod wysłaliśmy przed chwilą. Nowy możesz poprosić za ${wynik.sekundy} s.`);
    return json({ ok: true, email: zamaskujEmail(u.email), minuty: KOD_MINUTY });
  } catch (e) {
    if (e instanceof BladPoczty) return blad(502, 'Nie udało się wysłać kodu na e-mail. Spróbuj ponownie za chwilę.');
    console.error('[panel] logowanie:', e instanceof Error ? e.message : e);
    return blad(503, 'Baza danych nie odpowiada. Spróbuj ponownie za chwilę.');
  }
};
