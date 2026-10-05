// Dane firmy. Osoby, dzialy i finansowanie mozna zmienic w panelu /admin/ (src/data/stan.ts):
// eksporty ponizej sa wtedy przeliczane, a oryginaly zostaja w stalych pisanych wielkimi literami.
//
// Dane firmy. Zrodlo: phuprobud.pl (zrzut z 30.09.2026) i regulamin sprzedazy (PDF, s. 1).
// Wspolrzedne adresu: OpenStreetMap Nominatim dla „Poznanska 152, 62-052 Komorniki”.

import { poZmianie, tekstNadpisany } from './stan';

export const firma = {
  nazwa: 'PHU Probud',
  wlasciciel: 'Szymon Atraszkiewicz',
  nazwaPrawna: 'Szymon Atraszkiewicz PHU Probud',
  od: 1994,
  adres: { ulica: 'ul. Poznańska 152', kod: '62-052', miasto: 'Komorniki' },
  wspolrzedne: { lat: 52.3447067, lng: 16.8276582 },
  nip: '7771003543',
  regon: '630245343',
  konta: [
    { waluta: 'PLN', numer: '94 1090 1362 0000 0000 3663 4808' },
    { waluta: 'EUR', numer: '39 1090 1362 0000 0001 3205 5862' },
  ],
  otomoto: 'https://phuprobud.otomoto.pl/inventory',
  facebook: 'https://www.facebook.com/profile.php?id=61557836707076',
  instagram: 'https://www.instagram.com/phuprobud/',
  dokumenty: {
    polityka: '/dokumenty/polityka-prywatnosci-phu-probud.pdf',
    regulamin: '/dokumenty/regulamin-sprzedazy-phu-probud.pdf',
  },
} as const;

export const trasaHref = `https://www.google.com/maps/dir/?api=1&destination=${firma.wspolrzedne.lat},${firma.wspolrzedne.lng}`;

export type Osoba = {
  id: string;
  imie: string;
  nazwisko: string;
  /** dzial albo funkcja, pod nazwiskiem */
  rola: string;
  opis?: string;
  telefon?: string;
  /** skad wiemy, ze numer i funkcja naleza do tej osoby */
  zrodlo: string;
};

// Numery przypisane imiennie na podstawie https://ewpa.pl/kontakt/ (siostrzana firma pod tym samym
// adresem; te same numery sa na phuprobud.pl w dzialach sprzedazy i czesci). Stan: 30.09.2026.
// 662 997 955 (serwis) i 722 223 755 (administracja) to numery dzialow, bez osoby.
const krzysztof: Osoba = {
  id: 'krzysztof-bilski', imie: 'Krzysztof', nazwisko: 'Bilski', rola: 'Sprzedaż maszyn',
  telefon: '+48 601 896 689', zrodlo: 'https://ewpa.pl/kontakt/',
};
const marcin: Osoba = {
  id: 'marcin-maj', imie: 'Marcin', nazwisko: 'Maj', rola: 'Sprzedaż maszyn',
  telefon: '+48 601 416 618', zrodlo: 'https://ewpa.pl/kontakt/',
};
const tomasz: Osoba = {
  id: 'tomasz-jurga', imie: 'Tomasz', nazwisko: 'Jurga', rola: 'Części zamienne',
  telefon: '+48 693 221 733', zrodlo: 'https://ewpa.pl/kontakt/',
};

/** Osoby i dzialy w tresci z repozytorium: z nich panel bierze oryginaly, a serwer liste kluczy. */
export const OSOBY: Osoba[] = [krzysztof, marcin, tomasz];
export const ID_DZIALOW = ['sprzedaz', 'serwis', 'czesci', 'administracja'] as const;

/** Sekcja „Z kim rozmawiasz”: tylko osoby z wlasnym numerem, z rola i telefonem. */
export let zespol: Osoba[] = [];
/** Handlowcy z numerami: pasek telefonu, blok „Zapytaj” w katalogu, naglowek. */
export let handlowcy: Osoba[] = [];

export type Telefon = { numer: string; osoba?: string; osobaId?: string };
export type Dzial = {
  id: (typeof ID_DZIALOW)[number];
  nazwa: string;
  telefony: Telefon[];
  email: string;
  dopisek?: string;
};

const telefonOsoby = (o: Osoba): Telefon => ({ numer: o.telefon!, osoba: `${o.imie} ${o.nazwisko}`, osobaId: o.id });
const zbudujDzialy = (k: Osoba, m: Osoba, t: Osoba): Dzial[] => [
  { id: 'sprzedaz', nazwa: 'Sprzedaż maszyn', telefony: [telefonOsoby(k), telefonOsoby(m)], email: 'sprzedaz@phuprobud.pl' },
  { id: 'serwis', nazwa: 'Serwis', telefony: [{ numer: '+48 662 997 955' }], email: 'zlecenia@ewpa.pl', dopisek: 'Zlecenia serwisowe przyjmuje EWPA.' },
  { id: 'czesci', nazwa: 'Części zamienne', telefony: [telefonOsoby(t)], email: 'handel@phuprobud.pl' },
  { id: 'administracja', nazwa: 'Administracja', telefony: [{ numer: '+48 722 223 755' }], email: 'info@phuprobud.pl' },
];
export let dzialy: Dzial[] = [];

const FINANSOWANIE = {
  firma: 'BPCE Equipment Solutions Polska',
  osoba: 'Sebastian Bartczak',
  telefon: '+48 660 785 358',
  email: 'sebastian.bartczak@groupebpce.com',
};
export let finansowanie = FINANSOWANIE;

// W panelu imie i nazwisko to jedno pole: pierwsze slowo jest imieniem (pasek telefonu pokazuje samo imie).
function osobaZPanelu(o: Osoba): Osoba {
  const [imie, ...reszta] = (tekstNadpisany(`osoba:${o.id}:imie`) ?? `${o.imie} ${o.nazwisko}`).trim().split(/\s+/);
  return {
    ...o,
    imie,
    nazwisko: reszta.join(' '),
    rola: tekstNadpisany(`osoba:${o.id}:rola`) ?? o.rola,
    telefon: tekstNadpisany(`osoba:${o.id}:telefon`) ?? o.telefon,
  };
}

poZmianie(() => {
  const [k, m, t] = OSOBY.map(osobaZPanelu);
  zespol = [k, m, t];
  handlowcy = [k, m];
  dzialy = zbudujDzialy(k, m, t).map((d) => ({
    ...d,
    // Numer dzialu z panelu dotyczy tylko numerow bez osoby (serwis, administracja).
    telefony: d.telefony.map((tel) => (tel.osobaId ? tel : { numer: tekstNadpisany(`dzial:${d.id}:telefon`) ?? tel.numer })),
    email: tekstNadpisany(`dzial:${d.id}:email`) ?? d.email,
  }));
  finansowanie = {
    ...FINANSOWANIE,
    osoba: tekstNadpisany('finansowanie:osoba') ?? FINANSOWANIE.osoba,
    telefon: tekstNadpisany('finansowanie:telefon') ?? FINANSOWANIE.telefon,
    email: tekstNadpisany('finansowanie:email') ?? FINANSOWANIE.email,
  };
});

export const pbdevs = { url: 'https://pbdevs.com', nazwa: 'PB Devs' };
