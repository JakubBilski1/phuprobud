// Sprawdzenie zapisu z panelu przed wlozeniem do bazy. Panel waliduje pola w przegladarce,
// ale serwer nie ufa temu, co przyszlo: przyjmuje tylko znane klucze i wartosci we wlasciwym
// ksztalcie (linki bez „javascript:”, zdjecia tylko z manifestu albo z bazy).
import manifest from '../data/obrazy.json';
import { ID_DZIALOW, OSOBY } from '../data/firma';
import { WSZYSTKIE_KATEGORIE, WSZYSTKIE_MODELE } from '../data/katalog';
import { infoMedia } from '../data/stan';
import { tresci } from '../data/tresci';
import { slotyZdjec } from '../data/zdjecia-strony';
import { idMedia, PREFIKS_PLIKU, type Pola, type PozycjaGalerii, type Wartosc } from '../lib/nadpisania';

type Regula = 'tekst' | 'przelacznik' | 'telefon' | 'email' | 'link' | 'galeria' | 'zdjecie';

const MAKS_TEKST = 600;
const MAKS_ZDJEC_W_GALERII = 80;

function reguly(): Map<string, Regula> {
  const r = new Map<string, Regula>();
  for (const k of Object.keys(tresci)) r.set(`tekst:${k}`, 'tekst');
  for (const m of WSZYSTKIE_MODELE) {
    r.set(`model:${m.id}:widoczny`, 'przelacznik');
    for (const pole of ['opis', 'etykieta', 'cena']) r.set(`model:${m.id}:${pole}`, 'tekst');
  }
  for (const k of WSZYSTKIE_KATEGORIE) {
    r.set(`kategoria:${k.id}:widoczna`, 'przelacznik');
    for (const pole of ['nazwa', 'opis']) r.set(`kategoria:${k.id}:${pole}`, 'tekst');
  }
  for (const o of OSOBY) {
    r.set(`osoba:${o.id}:imie`, 'tekst');
    r.set(`osoba:${o.id}:rola`, 'tekst');
    r.set(`osoba:${o.id}:telefon`, 'telefon');
  }
  for (const d of ID_DZIALOW) {
    r.set(`dzial:${d}:telefon`, 'telefon');
    r.set(`dzial:${d}:email`, 'email');
  }
  r.set('finansowanie:osoba', 'tekst');
  r.set('finansowanie:telefon', 'telefon');
  r.set('finansowanie:email', 'email');
  r.set('ogloszenie:wlaczone', 'przelacznik');
  r.set('ogloszenie:tekst', 'tekst');
  r.set('ogloszenie:link', 'link');
  r.set('galeria:uklad', 'galeria');
  for (const s of slotyZdjec) r.set(`zdjecie:${s.id}`, 'zdjecie');
  return r;
}

const znaneZdjecie = (z: string) => z in manifest || Boolean(infoMedia(idMedia(z) ?? ''));

function poprawna(regula: Regula, w: Wartosc): boolean {
  if (regula === 'przelacznik') return typeof w === 'boolean';
  if (typeof w !== 'string') return false;
  if (regula === 'galeria') {
    if (w.length > 30_000) return false;
    try {
      const uklad = JSON.parse(w) as PozycjaGalerii[];
      return Array.isArray(uklad) && uklad.length > 0 && uklad.length <= MAKS_ZDJEC_W_GALERII
        && uklad.every((p) => p && typeof p.z === 'string' && typeof p.p === 'string' && p.p.length <= 120 && znaneZdjecie(p.z));
    } catch {
      return false;
    }
  }
  if (w.length > MAKS_TEKST) return false;
  if (regula === 'zdjecie') return w === '' || (w.startsWith(PREFIKS_PLIKU) ? w.slice(PREFIKS_PLIKU.length) in manifest : znaneZdjecie(w));
  if (w === '') return true;
  if (regula === 'telefon') return /^\+?[\d\s-]{9,20}$/.test(w);
  if (regula === 'email') return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(w);
  // Link z ogloszenia trafia do atrybutu href: tylko adres na tej stronie albo http(s).
  if (regula === 'link') return /^(\/(?!\/)|https?:\/\/)[^\s<>"']*$/.test(w);
  return true;
}

/** Zwraca oczyszczony zapis albo opis bledu. */
export function sprawdzPola(dane: unknown): { pola: Pola } | { blad: string } {
  if (!dane || typeof dane !== 'object' || Array.isArray(dane)) return { blad: 'Zapis ma zły format.' };
  const znane = reguly();
  const pola: Pola = {};
  for (const [klucz, zmiana] of Object.entries(dane as Record<string, unknown>)) {
    const regula = znane.get(klucz);
    if (!regula) return { blad: `Nieznane pole: ${klucz.slice(0, 80)}` };
    const { w, o } = (zmiana ?? {}) as { w?: unknown; o?: unknown };
    if ((typeof w !== 'string' && typeof w !== 'boolean') || !poprawna(regula, w)) return { blad: `Nieprawidłowa wartość pola ${klucz}.` };
    // Oryginal sluzy tylko liscie zmian w panelu; przycinamy go, zeby nie dalo sie nim zapchac bazy.
    const oryginal: Wartosc = typeof o === 'boolean' ? o : String(o ?? '').slice(0, regula === 'galeria' ? 30_000 : MAKS_TEKST);
    pola[klucz] = { w: typeof w === 'string' ? w.trim() : w, o: oryginal };
  }
  return { pola };
}

/** Identyfikatory wgranych zdjec, do ktorych prowadzi zapis. */
export function uzywaneMedia(pola: Pola): string[] {
  const tekst = Object.values(pola).map((z) => (typeof z.w === 'string' ? z.w : '')).join(' ');
  return [...new Set([...tekst.matchAll(/media:([a-f0-9]{24})/g)].map((m) => m[1]))];
}
