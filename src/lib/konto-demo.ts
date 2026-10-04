// Konto panelu demonstracyjnego /admin/: logowanie i zmiana hasla bez serwera.
//
// Na starcie dziala login i haslo z formularza (DEMO). Pierwsza zmiana hasla wymaga kodu startowego
// (6 cyfr, przekazany wlascicielowi strony osobno); w kodzie strony jest tylko jego skrot PBKDF2.
// Po zmianie haslo trafia do localStorage tej przegladarki jako skrot z losowa sola, a dane startowe
// przestaja dzialac. To nie jest zabezpieczenie na produkcje: kazdy, kto ma dostep do przegladarki,
// moze wyczyscic dane strony i wrocic do ustawien startowych (patrz README, „Przed przejsciem z demo”).

export const KLUCZ_KONTA = 'probud-panel-konto';
export const DEMO = { login: 'admin', haslo: 'probud2026' } as const;
export const MIN_DLUGOSC_HASLA = 10;

const ITERACJE = 210_000;
// Skrot kodu startowego (PBKDF2-SHA256, 210 000 iteracji). Samego kodu nie ma w repozytorium.
const KOD_STARTOWY = { sol: 'KBKxrrSXWQ64JmTYPiIzcA==', skrot: 'pWjKnbn+iAmtqYeWL0e0Vt6rJ+JPliofsIu1nMGrMSI=' };
// Po kilku blednych kodach z rzedu formularz chwile czeka (utrudnia zgadywanie z reki).
const PROBY = 'probud-panel-proby-kodu';
const MAKS_PROB = 5;
const PRZERWA_MS = 30_000;

export type Konto = { wersja: 1; login: string; sol: string; skrot: string; zmieniono: string };

const doB64 = (bajty: Uint8Array) => btoa(String.fromCharCode(...bajty));
const zB64 = (tekst: string) => Uint8Array.from(atob(tekst), (z) => z.charCodeAt(0));

async function pbkdf2(tekst: string, sol: Uint8Array<ArrayBuffer>): Promise<string> {
  const klucz = await crypto.subtle.importKey('raw', new TextEncoder().encode(tekst), 'PBKDF2', false, ['deriveBits']);
  const bity = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sol, iterations: ITERACJE }, klucz, 256);
  return doB64(new Uint8Array(bity));
}

/** Zapisane konto albo null, gdy haslo nie bylo jeszcze zmieniane (tryb startowy). */
export function konto(): Konto | null {
  try {
    const k = JSON.parse(localStorage.getItem(KLUCZ_KONTA) ?? 'null') as Konto | null;
    return k?.wersja === 1 && k.sol && k.skrot ? k : null;
  } catch {
    return null;
  }
}

export async function sprawdzLogowanie(login: string, haslo: string): Promise<boolean> {
  const k = konto();
  if (!k) return login === DEMO.login && haslo === DEMO.haslo;
  return login === k.login && (await pbkdf2(haslo, zB64(k.sol))) === k.skrot;
}

/** Sekundy do odblokowania formularza po zbyt wielu blednych kodach (0 = mozna probowac). */
export function blokadaKodu(): number {
  try {
    const { liczba, od } = JSON.parse(sessionStorage.getItem(PROBY) ?? '{"liczba":0,"od":0}');
    const zostalo = od + PRZERWA_MS - Date.now();
    return liczba >= MAKS_PROB && zostalo > 0 ? Math.ceil(zostalo / 1000) : 0;
  } catch {
    return 0;
  }
}

export async function sprawdzKodStartowy(kod: string): Promise<boolean> {
  const ok = (await pbkdf2(kod.trim(), zB64(KOD_STARTOWY.sol))) === KOD_STARTOWY.skrot;
  try {
    const stan = JSON.parse(sessionStorage.getItem(PROBY) ?? '{"liczba":0,"od":0}');
    const liczba = ok ? 0 : (blokadaKodu() === 0 && stan.liczba >= MAKS_PROB ? 1 : stan.liczba + 1);
    sessionStorage.setItem(PROBY, JSON.stringify({ liczba, od: Date.now() }));
  } catch { /* bez sessionStorage nie liczymy prob */ }
  return ok;
}

export async function sprawdzHaslo(haslo: string): Promise<boolean> {
  const k = konto();
  return k ? (await pbkdf2(haslo, zB64(k.sol))) === k.skrot : haslo === DEMO.haslo;
}

/** Zapisuje nowe haslo (skrot z nowa sola). Od tej chwili dane startowe nie dzialaja. */
export async function ustawHaslo(haslo: string): Promise<boolean> {
  const sol = crypto.getRandomValues(new Uint8Array(16));
  const nowe: Konto = { wersja: 1, login: konto()?.login ?? DEMO.login, sol: doB64(sol), skrot: await pbkdf2(haslo, sol), zmieniono: new Date().toISOString() };
  try {
    localStorage.setItem(KLUCZ_KONTA, JSON.stringify(nowe));
    return true;
  } catch {
    return false;
  }
}
