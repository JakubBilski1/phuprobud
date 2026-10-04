// Teksty strony, ktore mozna zmienic w panelu /admin/. Komponenty biora stad wartosc domyslna
// i oznaczaja element atrybutem data-tresc="klucz"; panel pokazuje te same pola z etykietami.
import { firma } from './firma';

export type PoleTresci = {
  grupa: string;
  etykieta: string;
  wartosc: string;
  /** textarea zamiast jednego wiersza */
  dlugi?: boolean;
  /** limit znakow, gdy dluzszy tekst rozsadzilby uklad */
  max?: number;
  /** gdzie tekst jest na stronie (link „Pokaz na stronie” w panelu) */
  gdzie: string;
};

const pola = {
  'hero.tytul1': { grupa: 'Początek strony', etykieta: 'Tytuł, pierwszy wiersz', wartosc: 'Maszyny', max: 14, gdzie: '/' },
  'hero.tytul2': { grupa: 'Początek strony', etykieta: 'Tytuł, drugi wiersz', wartosc: 'budowlane', max: 14, gdzie: '/' },
  'hero.lead': {
    grupa: 'Początek strony', etykieta: 'Tekst pod tytułem', dlugi: true, gdzie: '/',
    wartosc: `${firma.adres.miasto} pod Poznaniem, od ${firma.od} roku. Sprzedajemy nowe maszyny BOMAG, sprowadzamy używane z całej Europy i skupujemy maszyny budowlane.`,
  },
  'hero.przycisk1': { grupa: 'Początek strony', etykieta: 'Przycisk do katalogu', wartosc: 'Zobacz maszyny nowe', max: 40, gdzie: '/' },
  'hero.przycisk2': { grupa: 'Początek strony', etykieta: 'Przycisk do otomoto', wartosc: 'Używane na otomoto', max: 40, gdzie: '/' },

  'oferta.tytul': { grupa: 'Maszyny nowe', etykieta: 'Nagłówek sekcji', wartosc: 'Maszyny nowe', max: 40, gdzie: '/#oferta' },
  'oferta.lead': {
    grupa: 'Maszyny nowe', etykieta: 'Tekst sekcji', dlugi: true, gdzie: '/#oferta',
    wartosc: 'Stopy wibracyjne, zagęszczarki i walce BOMAG.',
  },
  'katalog.lead': {
    grupa: 'Maszyny nowe', etykieta: 'Katalog: tekst pod liczbą modeli', dlugi: true, gdzie: '/oferta/',
    wartosc: 'BOMAG Light Equipment sprzedajemy jako autoryzowany dystrybutor na województwa wielkopolskie i kujawsko-pomorskie.',
  },
  'zapytaj.tekst': {
    grupa: 'Maszyny nowe', etykieta: 'Katalog: blok „Zapytaj” na dole podstron', dlugi: true, gdzie: '/oferta/',
    wartosc: 'Cenę, termin dostawy i dostępność podaje handlowiec. Zadzwoń albo zostaw wiadomość, a model będzie już wpisany w formularzu.',
  },

  'teren.tytul': { grupa: 'Dealer BOMAG', etykieta: 'Nagłówek sekcji', wartosc: 'Dealer BOMAG na Wielkopolskę i Kujawy', max: 60, gdzie: '/' },
  'teren.lead': {
    grupa: 'Dealer BOMAG', etykieta: 'Tekst sekcji', dlugi: true, gdzie: '/',
    wartosc: 'Maszyny BOMAG Light Equipment sprzedajemy jako autoryzowany dystrybutor na dwa województwa: wielkopolskie i kujawsko-pomorskie.',
  },

  'uzywane.tytul': { grupa: 'Maszyny używane', etykieta: 'Nagłówek sekcji', wartosc: 'Maszyny używane', max: 40, gdzie: '/#uzywane' },
  'uzywane.lead': {
    grupa: 'Maszyny używane', etykieta: 'Pierwszy akapit', dlugi: true, gdzie: '/#uzywane',
    wartosc: 'Sprowadzamy je od partnerów handlowych z całej Europy. Sprzedajemy tylko sprawny sprzęt przeznaczony na rynek UE, z dokumentacją CE.',
  },
  'uzywane.typ1': { grupa: 'Maszyny używane', etykieta: 'Specjalność 1: typ maszyn', wartosc: 'Ładowarki teleskopowe obrotowe', max: 60, gdzie: '/#uzywane' },
  'uzywane.marki1': { grupa: 'Maszyny używane', etykieta: 'Specjalność 1: marki', wartosc: 'Merlo w wersji Roto, w nich się specjalizujemy', max: 80, gdzie: '/#uzywane' },
  'uzywane.tekst': {
    grupa: 'Maszyny używane', etykieta: 'Drugi akapit', dlugi: true, gdzie: '/#uzywane',
    wartosc: 'Przed sprzedażą każda maszyna przechodzi przegląd, a jeśli trzeba, naprawę. Maszyny można też wziąć w wynajem długoterminowy.',
  },
  'uzywane.typ2': { grupa: 'Maszyny używane', etykieta: 'Specjalność 2: typ maszyn', wartosc: 'Koparki kołowe', max: 60, gdzie: '/#uzywane' },
  'uzywane.marki2': { grupa: 'Maszyny używane', etykieta: 'Specjalność 2: marki', wartosc: 'Case, Atlas, Yanmar', max: 80, gdzie: '/#uzywane' },
  'uzywane.typ3': { grupa: 'Maszyny używane', etykieta: 'Specjalność 3: typ maszyn', wartosc: 'Koparko-ładowarki', max: 60, gdzie: '/#uzywane' },
  'uzywane.marki3': { grupa: 'Maszyny używane', etykieta: 'Specjalność 3: marki', wartosc: 'Case, New Holland, JCB, CAT', max: 80, gdzie: '/#uzywane' },
  'uzywane.uwaga': {
    grupa: 'Maszyny używane', etykieta: 'Dopisek o skupie', dlugi: true, gdzie: '/#uzywane',
    wartosc: 'Skupujemy też maszyny budowlane. Opisz swoją maszynę w formularzu albo zadzwoń do handlowca.',
  },

  'handlowcy.tytul': { grupa: 'Z kim rozmawiasz', etykieta: 'Nagłówek sekcji', wartosc: 'Z kim rozmawiasz', max: 40, gdzie: '/#handlowcy' },
  'handlowcy.lead': {
    grupa: 'Z kim rozmawiasz', etykieta: 'Tekst sekcji', dlugi: true, gdzie: '/#handlowcy',
    wartosc: 'Dzwoń bezpośrednio do handlowca: o nowe BOMAG‑i, o maszyny używane i o wycenę maszyny, którą chcesz nam sprzedać.',
  },

  'finansowanie.tytul': { grupa: 'Finansowanie', etykieta: 'Nagłówek sekcji', wartosc: 'Finansowanie', max: 40, gdzie: '/#finansowanie' },
  'finansowanie.lead': {
    grupa: 'Finansowanie', etykieta: 'Tekst sekcji', dlugi: true, gdzie: '/#finansowanie',
    wartosc: 'Zakup maszyn używanych i sprzętu BOMAG można sfinansować przez BPCE Equipment Solutions Polska. Warunki ustalasz bezpośrednio z opiekunem finansowania.',
  },
} satisfies Record<string, PoleTresci>;

export type KluczTresci = keyof typeof pola;
export const tresci: Record<KluczTresci, PoleTresci> = pola;

/** Wartosc domyslna tekstu; element na stronie dostaje data-tresc={klucz}. */
export const tresc = (klucz: KluczTresci): string => tresci[klucz].wartosc;

/** Kolejnosc grup w panelu = kolejnosc sekcji na stronie. */
export const grupyTresci = [...new Set(Object.values(tresci).map((p) => p.grupa))];
