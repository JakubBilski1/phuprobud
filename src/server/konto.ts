// Konta panelu /admin/: uzytkownicy w tabeli panel_uzytkownicy (login = e-mail), haslo jako
// skrot scrypt, sesje w bazie.
//
// Nowe konto (wymaga_zmiany = true) loguje sie haslem startowym ze zmiennej PANEL_HASLO_STARTOWE,
// tez z kodem z e-maila. Dopoki nie ustawi wlasnego hasla, moze tylko je zmienic: zapis zmian
// na stronie i zdjec serwer odrzuca (wymagajSesji w src/server/odpowiedzi.ts).
//
// Logowanie ma dwa obowiazkowe kroki: e-mail z haslem, potem 6-cyfrowy kod wyslany na ten e-mail.
// Po dobrym hasle serwer zapisuje wyzwanie (panel_kody) i daje przegladarce ciasteczko z losowym
// tokenem wyzwania. Kod w bazie lezy jako HMAC z tym tokenem: sam wyciek bazy nie pozwala go
// zgadnac bez ciasteczka. Kod dziala 10 minut i przyjmuje 5 prob; sesja powstaje dopiero po kodzie.
//
// Uzytkownikow dodaje sie w bazie jednym zapytaniem SQL (docs/WDROZENIE.md, sekcja Panel).
import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { sql } from './baza';
import { wyslijKod } from './poczta';

const CIASTECZKO = 'probud_panel';
const CIASTECZKO_KODU = 'probud_kod';
const SCIEZKA_KODU = '/api/panel/';
const SESJA_DNI = 14;
export const KOD_MINUTY = 10;
const KOD_PROBY = 5;
const KOD_ODSTEP_S = 30;

export type Uzytkownik = { id: number; email: string; skrot: string; sol: string; wymaga_zmiany: boolean; zmieniono: Date };
const KOLUMNY = 'u.id, u.email, u.skrot, u.sol, u.wymaga_zmiany, u.zmieniono';

function skrotHasla(haslo: string, sol: string): Promise<Buffer> {
  return new Promise((ok, blad) => {
    scrypt(haslo.normalize('NFKC'), Buffer.from(sol, 'base64'), 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, klucz) => (e ? blad(e) : ok(klucz)));
  });
}

async function nowySkrot(haslo: string) {
  const sol = randomBytes(16).toString('base64');
  return { sol, skrot: (await skrotHasla(haslo, sol)).toString('base64') };
}

async function zgodne(haslo: string, wzor: Pick<Uzytkownik, 'skrot' | 'sol'>): Promise<boolean> {
  const oczekiwany = Buffer.from(wzor.skrot, 'base64');
  const proba = await skrotHasla(haslo, wzor.sol);
  return oczekiwany.length === proba.length && timingSafeEqual(oczekiwany, proba);
}

/** Haslo startowe ze zmiennej PANEL_HASLO_STARTOWE; bez zmiennej zadne haslo nie jest startowe. */
function hasloStartowe(haslo: string): boolean {
  const startowe = process.env.PANEL_HASLO_STARTOWE ?? '';
  if (!startowe) return false;
  const skrot = (tekst: string) => createHash('sha256').update(tekst.normalize('NFKC')).digest();
  return timingSafeEqual(skrot(haslo), skrot(startowe));
}

/** Haslo konta: startowe, dopoki konto nie ma wlasnego, potem wlasne ze skrotu w bazie. */
async function hasloKonta(haslo: string, u: Uzytkownik): Promise<boolean> {
  return u.wymaga_zmiany ? hasloStartowe(haslo) : zgodne(haslo, u);
}

// Dla nieznanego e-maila liczymy skrot atrapy, zeby czas odpowiedzi nie zdradzal, ktore konto istnieje.
const ATRAPA = { skrot: randomBytes(64).toString('base64'), sol: randomBytes(16).toString('base64') };

export const normalizujEmail = (email: string) => email.trim().toLowerCase();

/** „info@phuprobud.pl” → „i***@phuprobud.pl”: wystarczy, zeby rozpoznac skrzynke. */
export function zamaskujEmail(email: string): string {
  const [nazwa, domena] = email.split('@');
  return domena ? `${nazwa.slice(0, 1)}***@${domena}` : email;
}

/** Czy w bazie jest choc jedno konto (inaczej panel jest nieskonfigurowany). */
export async function saUzytkownicy(): Promise<boolean> {
  const [w] = await sql<{ jest: boolean }>('select exists (select 1 from panel_uzytkownicy) as jest');
  return Boolean(w?.jest);
}

// ---------- Ograniczenie prob logowania ----------
// W pamieci procesu: na adres i lacznie (adres z naglowka da sie podrobic, limit laczny nie).
// Licza sie zle hasla i zle kody.
const OKNO_MS = 10 * 60_000;
const MAKS_NA_ADRES = 6;
const MAKS_LACZNIE = 40;
const nieudane = new Map<string, number[]>();
const WSZYSCY = '*';

function swieze(klucz: string): number[] {
  const teraz = Date.now();
  const lista = (nieudane.get(klucz) ?? []).filter((t) => teraz - t < OKNO_MS);
  if (lista.length) nieudane.set(klucz, lista);
  else nieudane.delete(klucz);
  return lista;
}

/** Sekundy do nastepnej dozwolonej proby (0 = mozna probowac). */
export function blokada(adres: string): number {
  const pozostalo = (lista: number[], maks: number) => (lista.length >= maks ? Math.ceil((lista[lista.length - maks] + OKNO_MS - Date.now()) / 1000) : 0);
  return Math.max(pozostalo(swieze(adres), MAKS_NA_ADRES), pozostalo(swieze(WSZYSCY), MAKS_LACZNIE), 0);
}

export function odnotujNieudana(adres: string) {
  for (const klucz of [adres, WSZYSCY]) nieudane.set(klucz, [...swieze(klucz), Date.now()]);
  if (nieudane.size > 5000) nieudane.clear();
}

export const adresKlienta = (zadanie: Request) => zadanie.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'nieznany';

/** Krok 1: e-mail i haslo. Nieudana proba liczy sie do blokady. */
export async function sprawdzHaslo(email: string, haslo: string, adres: string): Promise<Uzytkownik | null> {
  const [u] = await sql<Uzytkownik>(`select ${KOLUMNY} from panel_uzytkownicy u where u.email = $1`, [normalizujEmail(email)]);
  // Skrot liczymy zawsze, takze dla hasla startowego, zeby czas odpowiedzi nie zdradzal stanu konta.
  const zAtrapa = await zgodne(haslo, u && !u.wymaga_zmiany ? u : ATRAPA);
  const ok = u ? (u.wymaga_zmiany ? hasloStartowe(haslo) : zAtrapa) : false;
  if (!ok) odnotujNieudana(adres);
  return ok ? u : null;
}

// ---------- Kod z e-maila ----------
const skrotTokenu = (token: string) => createHash('sha256').update(token).digest('hex');
const skrotKodu = (token: string, kod: string) => createHmac('sha256', token).update(kod).digest();
const poprawnyToken = (token: string | undefined): token is string => Boolean(token && /^[a-f0-9]{64}$/.test(token));

const opcjeCiasteczka = (maxAge: number, path: string) => ({
  httpOnly: true,
  sameSite: 'strict' as const,
  // W trybie deweloperskim (http://localhost) ciasteczko bez Secure, na serwerze zawsze z.
  secure: !import.meta.env.DEV,
  path,
  maxAge,
});

/**
 * Wysyla nowy kod na e-mail uzytkownika i zapisuje wyzwanie. Poprzedni kod tego uzytkownika
 * przestaje dzialac. Nowy kod najwczesniej 30 s po poprzednim, zeby nie zasypac skrzynki.
 */
export async function wyslijKodLogowania(u: Uzytkownik, ciasteczka: AstroCookies): Promise<{ wyslano: true } | { wyslano: false; sekundy: number }> {
  const [ostatni] = await sql<{ sekundy: number }>(
    `select ceil(extract(epoch from (utworzono + interval '${KOD_ODSTEP_S} seconds' - now())))::int as sekundy
     from panel_kody where uzytkownik_id = $1 order by utworzono desc limit 1`,
    [u.id],
  );
  if (ostatni && ostatni.sekundy > 0) return { wyslano: false, sekundy: ostatni.sekundy };

  const token = randomBytes(32).toString('hex');
  const kod = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await sql('delete from panel_kody where wygasa < now() or uzytkownik_id = $1', [u.id]);
  await sql(
    `insert into panel_kody (skrot_tokenu, uzytkownik_id, skrot_kodu, wygasa) values ($1, $2, $3, now() + interval '${KOD_MINUTY} minutes')`,
    [skrotTokenu(token), u.id, skrotKodu(token, kod).toString('hex')],
  );
  try {
    await wyslijKod(u.email, kod, KOD_MINUTY);
  } catch (e) {
    // Kod, ktory nie dotarl, nie moze blokowac kolejnej proby przez 30 s.
    await sql('delete from panel_kody where skrot_tokenu = $1', [skrotTokenu(token)]);
    throw e;
  }
  ciasteczka.set(CIASTECZKO_KODU, token, opcjeCiasteczka(KOD_MINUTY * 60, SCIEZKA_KODU));
  return { wyslano: true };
}

/**
 * Krok 2: kod z e-maila. Dobry kod zamyka wyzwanie i otwiera sesje. „wygasl” oznacza, ze trzeba
 * zaczac od hasla: kod minal, zostal juz uzyty albo wyczerpal limit prob.
 */
export async function sprawdzKod(kod: string, ciasteczka: AstroCookies, adres: string): Promise<'ok' | 'zly' | 'wygasl'> {
  const token = ciasteczka.get(CIASTECZKO_KODU)?.value;
  if (!poprawnyToken(token)) return 'wygasl';
  const klucz = skrotTokenu(token);
  const zamknij = async () => {
    await sql('delete from panel_kody where skrot_tokenu = $1', [klucz]);
    ciasteczka.delete(CIASTECZKO_KODU, { path: SCIEZKA_KODU });
  };

  // Proba liczy sie, zanim porownamy kod: rownolegle zadania nie obejda limitu.
  const [w] = await sql<{ uzytkownik_id: number; skrot_kodu: string; proby: number }>(
    `update panel_kody set proby = proby + 1
     where skrot_tokenu = $1 and wygasa > now() and proby < $2
     returning uzytkownik_id, skrot_kodu, proby`,
    [klucz, KOD_PROBY],
  );
  if (!w) {
    await zamknij();
    return 'wygasl';
  }
  const oczekiwany = Buffer.from(w.skrot_kodu, 'hex');
  const proba = skrotKodu(token, kod);
  if (/^\d{6}$/.test(kod) && oczekiwany.length === proba.length && timingSafeEqual(oczekiwany, proba)) {
    await zamknij();
    await otworzSesje(w.uzytkownik_id, ciasteczka);
    return 'ok';
  }
  odnotujNieudana(adres);
  if (w.proby >= KOD_PROBY) {
    await zamknij();
    return 'wygasl';
  }
  return 'zly';
}

// ---------- Sesje ----------
export async function otworzSesje(uzytkownikId: number, ciasteczka: AstroCookies) {
  const token = randomBytes(32).toString('hex');
  // Sesje sprzed kont w bazie (bez uzytkownika) nie sa juz wazne.
  await sql('delete from panel_sesje where wygasa < now() or uzytkownik_id is null');
  await sql(`insert into panel_sesje (skrot_tokenu, uzytkownik_id, wygasa) values ($1, $2, now() + interval '${SESJA_DNI} days')`, [skrotTokenu(token), uzytkownikId]);
  ciasteczka.set(CIASTECZKO, token, opcjeCiasteczka(SESJA_DNI * 86_400, '/'));
}

/** Uzytkownik zalogowany w tej przegladarce albo null. */
export async function uzytkownikSesji(ciasteczka: AstroCookies): Promise<Uzytkownik | null> {
  const token = ciasteczka.get(CIASTECZKO)?.value;
  if (!poprawnyToken(token)) return null;
  const [u] = await sql<Uzytkownik>(
    `select ${KOLUMNY} from panel_sesje s join panel_uzytkownicy u on u.id = s.uzytkownik_id
     where s.skrot_tokenu = $1 and s.wygasa > now()`,
    [skrotTokenu(token)],
  );
  return u ?? null;
}

export async function zamknijSesje(ciasteczka: AstroCookies) {
  const token = ciasteczka.get(CIASTECZKO)?.value;
  if (token) await sql('delete from panel_sesje where skrot_tokenu = $1', [skrotTokenu(token)]);
  ciasteczka.delete(CIASTECZKO, { path: '/' });
}

/** Zmienia haslo po sprawdzeniu obecnego i wylogowuje pozostale sesje tego uzytkownika. */
export async function zmienHaslo(u: Uzytkownik, obecne: string, nowe: string, ciasteczka: AstroCookies): Promise<'ok' | 'zle-haslo' | 'startowe'> {
  if (!(await hasloKonta(obecne, u))) return 'zle-haslo';
  if (hasloStartowe(nowe)) return 'startowe';
  const { sol, skrot } = await nowySkrot(nowe);
  await sql('update panel_uzytkownicy set skrot = $1, sol = $2, wymaga_zmiany = false, zmieniono = now() where id = $3', [skrot, sol, u.id]);
  await sql('delete from panel_sesje where uzytkownik_id = $1', [u.id]);
  await otworzSesje(u.id, ciasteczka);
  return 'ok';
}
