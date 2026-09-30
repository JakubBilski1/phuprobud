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

export type Handlowiec = {
  id: string;
  imie: string;
  nazwisko: string;
  rola: string;
  telefon: string;
  zdjecie: string;
  /** szerokosc twarzy / szerokosc wyciecia - do wyrownania skali portretow */
  twarz: number;
  /** portret uciety kadrem z prawej: dosuwamy go do krawedzi panelu */
  ucietyZPrawej: boolean;
  /** object-position dla malej, kwadratowej miniatury (twarz na srodku) */
  kadrMaly: string;
};

// Numer 601 896 689 przypisal Krzysztofowi Jakub; drugi numer dzialu sprzedazy - Szymonowi.
// Uwaga: strona EWPA podaje 601 416 618 przy Marcinie Maju - do potwierdzenia z firma.
export const handlowcy: Handlowiec[] = [
  {
    id: 'krzysztof-bilski',
    imie: 'Krzysztof',
    nazwisko: 'Bilski',
    rola: 'Sprzedaż maszyn budowlanych',
    telefon: '+48 601 896 689',
    zdjecie: 'ludzie/krzysztof-bilski',
    twarz: 670 / 1600,
    ucietyZPrawej: true,
    kadrMaly: '50% 30%',
  },
  {
    id: 'szymon-atraszkiewicz',
    imie: 'Szymon',
    nazwisko: 'Atraszkiewicz',
    rola: 'Sprzedaż maszyn, prowadzi PHU Probud',
    telefon: '+48 601 416 618',
    zdjecie: 'ludzie/szymon-atraszkiewicz',
    twarz: 210 / 640,
    ucietyZPrawej: false,
    kadrMaly: '38% 30%',
  },
];

export type Dzial = {
  id: 'sprzedaz' | 'serwis' | 'czesci' | 'administracja' | 'finansowanie';
  nazwa: string;
  telefony: string[];
  email: string;
  dopisek?: string;
};

export const dzialy: Dzial[] = [
  { id: 'sprzedaz', nazwa: 'Sprzedaż maszyn', telefony: ['+48 601 896 689', '+48 601 416 618'], email: 'sprzedaz@phuprobud.pl' },
  { id: 'serwis', nazwa: 'Serwis', telefony: ['+48 662 997 955'], email: 'zlecenia@ewpa.pl', dopisek: 'Zlecenia serwisowe przyjmuje EWPA.' },
  { id: 'czesci', nazwa: 'Części zamienne', telefony: ['+48 693 221 733'], email: 'handel@phuprobud.pl' },
  { id: 'administracja', nazwa: 'Administracja', telefony: ['+48 722 223 755'], email: 'info@phuprobud.pl' },
];

export const finansowanie = {
  firma: 'BPCE Equipment Solutions Polska',
  osoba: 'Sebastian Bartczak',
  telefon: '+48 660 785 358',
  email: 'sebastian.bartczak@groupebpce.com',
};

export const pbdevs = { url: 'https://pbdevs.com', nazwa: 'PB Devs' };
