// Stan zmian z panelu /admin/ po stronie serwera. Serwer wczytuje go z bazy przy starcie
// i po kazdym zapisie (src/server/stan-serwera.ts); moduly danych (firma, katalog, tresci,
// realizacje) przeliczaja wtedy swoje eksporty. Przy buildzie stan jest pusty, wiec strony
// budowane statycznie (panel, 404) dostaja tresc oryginalna z repozytorium.
import type { Pola, Wartosc } from '../lib/nadpisania';

export type InfoMedia = { w: number; h: number };

let pola: Pola = {};
let media: Record<string, InfoMedia> = {};
let wersja = 0;
const sluchacze: (() => void)[] = [];

export const nadpisane = (klucz: string): Wartosc | undefined => pola[klucz]?.w;

/** Niepusty tekst z panelu albo undefined (pusty wpis nie zastepuje oryginalu). */
export const tekstNadpisany = (klucz: string): string | undefined => {
  const w = pola[klucz]?.w;
  return typeof w === 'string' && w.trim() ? w : undefined;
};

export const infoMedia = (id: string): InfoMedia | undefined => media[id];
/** Rosnie z kazda zmiana stanu; klucz pamieci podrecznej gotowych stron. */
export const wersjaStanu = () => wersja;

/** Rejestruje przeliczenie modulu danych i od razu je wykonuje. */
export function poZmianie(przelicz: () => void) {
  sluchacze.push(przelicz);
  przelicz();
}

export function ustawStan(nowePola: Pola, noweMedia: Record<string, InfoMedia>) {
  pola = nowePola;
  media = noweMedia;
  wersja++;
  sluchacze.forEach((f) => f());
}

export function dodajMedia(id: string, info: InfoMedia) {
  media = { ...media, [id]: info };
}
