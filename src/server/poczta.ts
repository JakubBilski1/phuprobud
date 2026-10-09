// Wysylka kodu logowania do panelu /admin/ przez SMTP (zmienne SMTP_*).
// Kod jest obowiazkowy, wiec bez skonfigurowanej poczty logowanie odmawia, zamiast wpuszczac
// bez drugiego kroku. Wyjatek: tryb deweloperski bez SMTP wypisuje kod w konsoli serwera.
import { createTransport, type Transporter } from 'nodemailer';

/** Poczta nie wyslala kodu (SMTP nie odpowiada albo odrzucil wiadomosc). */
export class BladPoczty extends Error {}

const zmienna = (nazwa: string) => process.env[nazwa]?.trim() ?? '';

export const maPoczte = () => Boolean(zmienna('SMTP_HOST') && zmienna('SMTP_UZYTKOWNIK') && zmienna('SMTP_HASLO'));

/** Czy logowanie moze ruszyc: na serwerze tylko z poczta, lokalnie takze bez niej. */
export const mozeWyslacKod = () => maPoczte() || Boolean(import.meta.env.DEV);

let transport: Transporter | null = null;

function polaczenie(): Transporter {
  if (!transport) {
    const port = Number(zmienna('SMTP_PORT') || 465);
    transport = createTransport({
      host: zmienna('SMTP_HOST'),
      port,
      // 465: szyfrowanie od pierwszego bajtu; 587: STARTTLS, wymagane.
      secure: port === 465,
      requireTLS: port !== 465,
      auth: { user: zmienna('SMTP_UZYTKOWNIK'), pass: zmienna('SMTP_HASLO') },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transport;
}

export async function wyslijKod(adresat: string, kod: string, minuty: number): Promise<void> {
  if (!maPoczte()) {
    if (import.meta.env.DEV) {
      console.info(`[panel] kod logowania dla ${adresat}: ${kod} (tryb deweloperski, bez SMTP)`);
      return;
    }
    throw new BladPoczty('Brak konfiguracji SMTP.');
  }
  const nadawca = zmienna('SMTP_NADAWCA') || `Panel phuprobud.pl <${zmienna('SMTP_UZYTKOWNIK')}>`;
  try {
    await polaczenie().sendMail({
      from: nadawca,
      to: adresat,
      subject: 'Kod logowania do panelu phuprobud.pl',
      text: [
        `Kod logowania do panelu strony phuprobud.pl: ${kod}`,
        '',
        `Kod działa ${minuty} minut i tylko raz.`,
        'Jeśli to nie Ty logujesz się do panelu, zignoruj tę wiadomość i zmień hasło do panelu.',
      ].join('\n'),
    });
  } catch (e) {
    console.error('[panel] wysylka kodu:', e instanceof Error ? e.message : e);
    throw new BladPoczty('Nie udało się wysłać kodu.');
  }
}
