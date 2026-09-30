// Dane firmy. Zrodlo: phuprobud.pl (zrzut z 30.09.2026) i regulamin sprzedazy (PDF, s. 1).
// Wspolrzedne adresu: OpenStreetMap Nominatim dla „Poznanska 152, 62-052 Komorniki”.

export const firma = {
  nazwa: 'PHU Probud',
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
  /** zamiast numeru: duzy napis (np. CEO), gdy osoba nie ma przypisanego telefonu */
  tytul?: string;
  opis?: string;
  telefon?: string;
  /** skad wiemy, ze numer i funkcja naleza do tej osoby */
  zrodlo: string;
};

// Numery przypisane imiennie na podstawie https://ewpa.pl/kontakt/ (siostrzana firma pod tym samym
// adresem; te same numery sa na phuprobud.pl w dzialach sprzedazy i czesci). Stan: 30.09.2026.
// Szymon Atraszkiewicz prowadzi PHU Probud (polityka prywatnosci) - bez przypisanego numeru.
// 662 997 955 (serwis) i 722 223 755 (administracja) to numery dzialow, bez osoby.
const krzysztof: Osoba = {
  id: 'krzysztof-bilski', imie: 'Krzysztof', nazwisko: 'Bilski', rola: 'Sprzedaż maszyn',
  telefon: '+48 601 896 689', zrodlo: 'https://ewpa.pl/kontakt/',
};
const szymon: Osoba = {
  id: 'szymon-atraszkiewicz', imie: 'Szymon', nazwisko: 'Atraszkiewicz', rola: 'Prowadzi PHU Probud',
  tytul: 'CEO', zrodlo: '/dokumenty/polityka-prywatnosci-phu-probud.pdf',
};
const marcin: Osoba = {
  id: 'marcin-maj', imie: 'Marcin', nazwisko: 'Maj', rola: 'Sprzedaż maszyn',
  telefon: '+48 601 416 618', zrodlo: 'https://ewpa.pl/kontakt/',
};
const tomasz: Osoba = {
  id: 'tomasz-jurga', imie: 'Tomasz', nazwisko: 'Jurga', rola: 'Części zamienne',
  telefon: '+48 693 221 733', zrodlo: 'https://ewpa.pl/kontakt/',
};

/** Centralny blok na stronie glownej. */
export const szef: Osoba = szymon;
/** Pod nim: rola i numer kazdej osoby. */
export const zespol: Osoba[] = [krzysztof, marcin, tomasz];
/** Handlowcy z numerami: pasek telefonu, blok „Zapytaj” w katalogu, naglowek. */
export const handlowcy: Osoba[] = [krzysztof, marcin];

export type Telefon = { numer: string; osoba?: string; osobaId?: string };
export type Dzial = {
  id: 'sprzedaz' | 'serwis' | 'czesci' | 'administracja';
  nazwa: string;
  telefony: Telefon[];
  email: string;
  dopisek?: string;
};

const telefonOsoby = (o: Osoba): Telefon => ({ numer: o.telefon!, osoba: `${o.imie} ${o.nazwisko}`, osobaId: o.id });
export const dzialy: Dzial[] = [
  { id: 'sprzedaz', nazwa: 'Sprzedaż maszyn', telefony: [telefonOsoby(krzysztof), telefonOsoby(marcin)], email: 'sprzedaz@phuprobud.pl' },
  { id: 'serwis', nazwa: 'Serwis', telefony: [{ numer: '+48 662 997 955' }], email: 'zlecenia@ewpa.pl', dopisek: 'Zlecenia serwisowe przyjmuje EWPA.' },
  { id: 'czesci', nazwa: 'Części zamienne', telefony: [telefonOsoby(tomasz)], email: 'handel@phuprobud.pl' },
  { id: 'administracja', nazwa: 'Administracja', telefony: [{ numer: '+48 722 223 755' }], email: 'info@phuprobud.pl' },
];

export const finansowanie = {
  firma: 'BPCE Equipment Solutions Polska',
  osoba: 'Sebastian Bartczak',
  telefon: '+48 660 785 358',
  email: 'sebastian.bartczak@groupebpce.com',
};

export const pbdevs = { url: 'https://pbdevs.com', nazwa: 'PB Devs' };
