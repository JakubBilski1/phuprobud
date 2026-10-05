// Konto panelu /admin/: jedno konto, haslo jako skrot scrypt w bazie, sesje w bazie.
//
// Konto zaklada sie samo przy pierwszym uzyciu, z haslem ze zmiennej PANEL_HASLO_STARTOWE
// (login z PANEL_LOGIN, domyslnie „admin”). Haslo startowe trzeba zmienic w panelu; po zmianie
// zmienna nie ma juz znaczenia. Ciasteczko sesji niesie losowy token, w bazie lezy jego skrot.
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { sql } from './baza';

const CIASTECZKO = 'probud_panel';
const SESJA_DNI = 14;

type Konto = { login: string; skrot: string; sol: string; wymaga_zmiany: boolean; zmieniono: Date };

function skrotHasla(haslo: string, sol: string): Promise<Buffer> {
  return new Promise((ok, blad) => {
    scrypt(haslo.normalize('NFKC'), Buffer.from(sol, 'base64'), 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, klucz) => (e ? blad(e) : ok(klucz)));
  });
}

async function nowySkrot(haslo: string) {
  const sol = randomBytes(16).toString('base64');
  return { sol, skrot: (await skrotHasla(haslo, sol)).toString('base64') };
}

async function zgodne(haslo: string, konto: Pick<Konto, 'skrot' | 'sol'>): Promise<boolean> {
  const wzor = Buffer.from(konto.skrot, 'base64');
  const proba = await skrotHasla(haslo, konto.sol);
  return wzor.length === proba.length && timingSafeEqual(wzor, proba);
}

/** Konto z bazy; przy pierwszym uzyciu zaklada je z haslem startowym. Null = panel nieskonfigurowany. */
export async function konto(): Promise<Konto | null> {
  const [istniejace] = await sql<Konto>('select login, skrot, sol, wymaga_zmiany, zmieniono from panel_konto where id = 1');
  if (istniejace) return istniejace;
  const startowe = process.env.PANEL_HASLO_STARTOWE;
  if (!startowe) return null;
  const { sol, skrot } = await nowySkrot(startowe);
  await sql('insert into panel_konto (id, login, skrot, sol, wymaga_zmiany) values (1, $1, $2, $3, true) on conflict (id) do nothing', [process.env.PANEL_LOGIN || 'admin', skrot, sol]);
  const [nowe] = await sql<Konto>('select login, skrot, sol, wymaga_zmiany, zmieniono from panel_konto where id = 1');
  return nowe ?? null;
}

// ---------- Ograniczenie prob logowania ----------
// W pamieci procesu: na adres i lacznie (adres z naglowka da sie podrobic, limit laczny nie).
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

function odnotujNieudana(adres: string) {
  for (const klucz of [adres, WSZYSCY]) nieudane.set(klucz, [...swieze(klucz), Date.now()]);
  if (nieudane.size > 5000) nieudane.clear();
}

export const adresKlienta = (zadanie: Request) => zadanie.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'nieznany';

/** Sprawdza login i haslo. Nieudana proba liczy sie do blokady. */
export async function sprawdzLogowanie(login: string, haslo: string, adres: string): Promise<Konto | null> {
  const k = await konto();
  // Skrot liczymy takze dla zlego loginu, zeby czas odpowiedzi nie zdradzal, co bylo bledne.
  const ok = k ? (await zgodne(haslo, k)) && login === k.login : false;
  if (!ok) odnotujNieudana(adres);
  return ok ? k : null;
}

// ---------- Sesje ----------
const skrotTokenu = (token: string) => createHash('sha256').update(token).digest('hex');

export async function otworzSesje(ciasteczka: AstroCookies) {
  const token = randomBytes(32).toString('hex');
  await sql('delete from panel_sesje where wygasa < now()');
  await sql(`insert into panel_sesje (skrot_tokenu, wygasa) values ($1, now() + interval '${SESJA_DNI} days')`, [skrotTokenu(token)]);
  ciasteczka.set(CIASTECZKO, token, {
    httpOnly: true,
    sameSite: 'strict',
    // W trybie deweloperskim (http://localhost) ciasteczko bez Secure, na serwerze zawsze z.
    secure: !import.meta.env.DEV,
    path: '/',
    maxAge: SESJA_DNI * 86_400,
  });
}

export async function zalogowany(ciasteczka: AstroCookies): Promise<boolean> {
  const token = ciasteczka.get(CIASTECZKO)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const [sesja] = await sql('select 1 from panel_sesje where skrot_tokenu = $1 and wygasa > now()', [skrotTokenu(token)]);
  return Boolean(sesja);
}

export async function zamknijSesje(ciasteczka: AstroCookies) {
  const token = ciasteczka.get(CIASTECZKO)?.value;
  if (token) await sql('delete from panel_sesje where skrot_tokenu = $1', [skrotTokenu(token)]);
  ciasteczka.delete(CIASTECZKO, { path: '/' });
}

/** Zmienia haslo po sprawdzeniu obecnego i wylogowuje pozostale sesje. */
export async function zmienHaslo(obecne: string, nowe: string, ciasteczka: AstroCookies): Promise<'ok' | 'zle-haslo'> {
  const k = await konto();
  if (!k || !(await zgodne(obecne, k))) return 'zle-haslo';
  const { sol, skrot } = await nowySkrot(nowe);
  await sql('update panel_konto set skrot = $1, sol = $2, wymaga_zmiany = false, zmieniono = now() where id = 1', [skrot, sol]);
  await sql('delete from panel_sesje');
  await otworzSesje(ciasteczka);
  return 'ok';
}
