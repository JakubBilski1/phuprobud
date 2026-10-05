// Zmiany z panelu /admin/: format wspolny dla panelu (przegladarka) i serwera.
//
// Zapis to roznica wzgledem tresci z repozytorium: { klucz: { w: nowa wartosc, o: oryginal } }.
// Klucze: tekst:<klucz>, model:<id>:<pole>, kategoria:<id>:<pole>, osoba:<id>:<pole>,
// dzial:<id>:<pole>, finansowanie:<pole>, ogloszenie:<pole>, galeria:uklad (JSON z kolejnoscia
// i podpisami), zdjecie:<slot> („plik:<klucz>” albo „media:<id>”). Serwer trzyma zapis w bazie
// i renderuje strone juz ze zmianami (src/data/stan.ts); oryginal sluzy tylko liscie zmian w panelu.

export type Wartosc = string | boolean;
export type Zmiana = { w: Wartosc; o: Wartosc };
export type Pola = Record<string, Zmiana>;

/** Pozycja galerii: z = klucz zdjecia w manifescie (np. realizacje/02) albo „media:<id>”, p = podpis. */
export type PozycjaGalerii = { z: string; p: string };

/** Zdjecie strony z manifestu (scripts/obrazy.mjs). */
export const PREFIKS_PLIKU = 'plik:';
/** Zdjecie wgrane w panelu, zapisane w bazie i podawane spod /media/. */
export const PREFIKS_MEDIA = 'media:';
export const WZOR_ID_MEDIA = /^[a-f0-9]{24}$/;
/** Szerokosc miniatury wgranego zdjecia (drugi plik obok pelnego). */
export const SZEROKOSC_MINI = 640;

export const idMedia = (odnosnik: string): string | null => {
  const id = odnosnik.startsWith(PREFIKS_MEDIA) ? odnosnik.slice(PREFIKS_MEDIA.length) : '';
  return WZOR_ID_MEDIA.test(id) ? id : null;
};

/** Adres wgranego zdjecia: pelne albo miniatura. */
export const adresMedia = (id: string, rozmiar: 'pelne' | 'mini' = 'pelne') => `/media/${id}${rozmiar === 'mini' ? '-m' : ''}.jpg`;

export const MIN_DLUGOSC_HASLA = 10;
