// Wysylka kodu logowania do panelu /admin/ przez pbdevs-mail (mail.pbdevs.com), usluge pocztowa
// PB Devs: mail wychodzi ze skrzynki PB Devs, wiec serwer strony nie potrzebuje dostepu do poczty
// Probudu. Zmienne: PBDEVS_MAIL_URL i PBDEVS_MAIL_KEY (klucz aplikacji „phuprobud” z panelu
// mail.pbdevs.com). Szablon „kod-logowania” tej aplikacji dostaje zmienne kod i minuty.
//
// Kod jest obowiazkowy, wiec bez skonfigurowanej poczty logowanie odmawia, zamiast wpuszczac
// bez drugiego kroku. Wyjatek: tryb deweloperski bez poczty wypisuje kod w konsoli serwera.
import { randomUUID } from 'node:crypto';

/** Poczta nie przyjela kodu do wysylki (usluga nie odpowiada albo odrzucila zadanie). */
export class BladPoczty extends Error {}

const SZABLON = 'kod-logowania';
const zmienna = (nazwa: string) => process.env[nazwa]?.trim() ?? '';

export const maPoczte = () => Boolean(zmienna('PBDEVS_MAIL_URL') && /^mk_(live|test)_[A-Z2-7]{32}$/.test(zmienna('PBDEVS_MAIL_KEY')));

/** Czy logowanie moze ruszyc: na serwerze tylko z poczta, lokalnie takze bez niej. */
export const mozeWyslacKod = () => maPoczte() || Boolean(import.meta.env.DEV);

export async function wyslijKod(adresat: string, kod: string, minuty: number): Promise<void> {
  if (!maPoczte()) {
    if (import.meta.env.DEV) {
      console.info(`[panel] kod logowania dla ${adresat}: ${kod} (tryb deweloperski, bez poczty)`);
      return;
    }
    throw new BladPoczty('Brak konfiguracji pbdevs-mail.');
  }
  let odpowiedz: Response;
  try {
    odpowiedz = await fetch(`${zmienna('PBDEVS_MAIL_URL').replace(/\/$/, '')}/api/v1/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${zmienna('PBDEVS_MAIL_KEY')}`,
        'Content-Type': 'application/json',
        // Kazdy kod jest inny, wiec klucz idempotencji tez: ponowienie tego samego zadania nie wysle drugiego maila.
        'Idempotency-Key': `kod-logowania-${randomUUID()}`,
      },
      body: JSON.stringify({ template: SZABLON, to: adresat, data: { kod, minuty: String(minuty) }, priority: 'high' }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    console.error('[panel] pbdevs-mail nie odpowiada:', e instanceof Error ? e.message : e);
    throw new BladPoczty('Usługa pocztowa nie odpowiada.');
  }
  if (!odpowiedz.ok) {
    const tresc = await odpowiedz.text().catch(() => '');
    console.error(`[panel] pbdevs-mail ${odpowiedz.status}: ${tresc.slice(0, 300)}`);
    throw new BladPoczty('Usługa pocztowa odrzuciła wysyłkę.');
  }
}
