// Katalog maszyn nowych. Dwie warstwy:
// 1. zrodla/katalog-astra.json - zweryfikowane dane (parametry ze zrodlem, zdjecia, PDF-y),
//    zebrane 30.09.2026 z PDF-ow hostowanych przez Probud i kart producentow. Nie edytujemy recznie.
// 2. ponizej - redakcja: kategorie po polsku, krotkie opisy z faktami, kolejnosc, etykiety.
import zrodlo from './zrodla/katalog-astra.json';
import { liczba } from '../lib/tekst';

type Wartosc = number | number[] | string | null;
type ModelZrodlowy = {
  id: string;
  nazwa: string;
  marka: string;
  kategoria: string;
  stare_adresy: string[];
  url_producenta: string | null;
  parametry: Record<string, Wartosc>;
  pdf: string[];
};

export type IdKategorii =
  | 'stopy-wibracyjne'
  | 'zageszczarki-jednokierunkowe'
  | 'zageszczarki-rewersyjne'
  | 'walce-prowadzone'
  | 'walce-tandemowe'
  | 'walce-do-gruntu'
  | 'schaeff'
  | 'gehl';

type DefinicjaKategorii = {
  id: IdKategorii;
  nazwa: string;
  marka: 'BOMAG' | 'Schaeff' | 'Gehl';
  piktogram: string;
  zrodla: string[];
  opis: string;
  karta: string[];
  zdjecieWPracy?: string;
};

const DEFINICJE: DefinicjaKategorii[] = [
  {
    id: 'stopy-wibracyjne', nazwa: 'Stopy wibracyjne', marka: 'BOMAG', piktogram: '01-stopa-wibracyjna',
    zrodla: ['ubijaki'], karta: ['masa_robocza_kg', 'szerokosc_robocza_mm', 'naped'],
    opis: 'Ubijaki do zasypek wykopów, fundamentów, robót kanalizacyjnych i napraw. BT 60 E pracuje na akumulatorze, bez spalin.',
    zdjecieWPracy: 'kategorie/ubijaki-01',
  },
  {
    id: 'zageszczarki-jednokierunkowe', nazwa: 'Zagęszczarki jednokierunkowe', marka: 'BOMAG', piktogram: '02-zageszczarka-jednokierunkowa',
    zrodla: ['zageszczarki-jednokierunkowe-plytowe'], karta: ['masa_robocza_kg', 'szerokosc_robocza_mm', 'sila_odsrodkowa_kn'],
    opis: 'Płyty wibracyjne do piasku, żwiru, asfaltu i kostki brukowej, od wąskiej BVP 10/36 po BP 25/50 D z silnikiem diesla.',
    zdjecieWPracy: 'kategorie/zageszczarki-jednokierunkowe-plytowe-01',
  },
  {
    id: 'zageszczarki-rewersyjne', nazwa: 'Zagęszczarki rewersyjne', marka: 'BOMAG', piktogram: '03-zageszczarka-rewersyjna',
    zrodla: ['zageszczarki-rewersyjne'], karta: ['masa_robocza_kg', 'szerokosc_robocza_mm', 'sila_odsrodkowa_kn'],
    opis: 'Cięższe płyty z jazdą w przód i w tył, do robót ziemnych, brukarskich i drogowych. Dwie wersje STONEGUARD są przeznaczone do kostki: ograniczają wyszczerbienia krawędzi.',
    zdjecieWPracy: 'kategorie/zageszczarki-rewersyjne-01',
  },
  {
    id: 'walce-prowadzone', nazwa: 'Walce prowadzone', marka: 'BOMAG', piktogram: '04-walec-jednobebnowy',
    zrodla: ['jednobebnowe-walce-wibracyjne', 'podwojne-walce-wibracyjne'], karta: ['masa_robocza_kg', 'szerokosc_robocza_mm', 'naped'],
    opis: 'Jedno- i dwubębnowe walce prowadzone ręcznie, do chodników, poboczy, pasów przy krawężnikach i napraw asfaltu.',
    zdjecieWPracy: 'kategorie/podwojne-walce-wibracyjne-01',
  },
  {
    id: 'walce-tandemowe', nazwa: 'Walce tandemowe', marka: 'BOMAG', piktogram: '06-walec-tandemowy',
    zrodla: ['walce-tandemowe'], karta: ['masa_robocza_kg', 'szerokosc_robocza_mm', 'moc_kw'],
    opis: 'Walce z fotelem operatora do asfaltu i gruntu. Wersje AD mają dwa bębny stalowe, wersje AC to walce kombinowane: bęben z przodu, koła ogumione z tyłu.',
    zdjecieWPracy: 'kategorie/walce-tandemowe-01',
  },
  {
    id: 'walce-do-gruntu', nazwa: 'Walce do robót ziemnych i wykopów', marka: 'BOMAG', piktogram: '07-walec-do-robot-ziemnych',
    zrodla: ['walec-uniwersalny', 'walce-do-robot-ziemnych'], karta: ['masa_robocza_kg', 'szerokosc_robocza_mm', 'moc_kw'],
    opis: 'BMP 8500 do wykopów i kanałów, sterowany pilotem, oraz BW 124 DH-5 do zagęszczania gruntu na placu budowy.',
    zdjecieWPracy: 'kategorie/walce-do-robot-ziemnych-01',
  },
  {
    id: 'schaeff', nazwa: 'Maszyny Schaeff', marka: 'Schaeff', piktogram: '08-minikoparka',
    zrodla: ['minikoparki', 'ladowarki-kolowe', 'koparki-kolowe'], karta: ['masa_robocza_kg', 'moc_kw', 'glebokosc_kopania_mm'],
    opis: 'Minikoparki SV15, SV17 i SV22, ładowarka kołowa TL80 i koparka kołowa TW75. Schaeff to marka należąca do Yanmar.',
    zdjecieWPracy: 'kategorie/ladowarki-kolowe-01',
  },
  {
    id: 'gehl', nazwa: 'Ładowarki gąsienicowe Gehl', marka: 'Gehl', piktogram: '09-ladowarka-gasienicowa',
    zrodla: ['ladowarki-gasienicowe'], karta: ['udzwig_nominalny_roc_35_kg', 'moc_brutto_kw', 'masa_robocza_kg'],
    opis: 'Pięć modeli, od RT105 do RT215. Wszystkie z silnikami Yanmar.',
    zdjecieWPracy: 'kategorie/ladowarki-gasienicowe-01',
  },
];

// Krotkie opisy: tylko to, co odroznia model. Zrodlo: opisy starej strony i karty producenta.
const OPISY: Record<string, string> = {
  'bt-50': 'Stopa 230 mm i silnik benzynowy Honda GXR 120, jak w BT 60.',
  'bt-60': 'Stopa 230 mm, silnik benzynowy Honda GXR 120. Rękojeść z regulacją wysokości tłumi drgania.',
  'bt-60-e': 'Zasilanie z akumulatora, bez spalin. Skok stopy i prędkość przesuwu jak w wersji spalinowej.',
  'bt-65': 'Szersza stopa, 280 mm, i większa siła niż w BT 60. Silnik spełnia normę Stage V.',
  'bvp-10-36': 'Najwęższa płyta w ofercie, 360 mm: do wąskich pasów i małych powierzchni.',
  'bp-15-40': 'Płyta 400 mm, silnik Honda GX 160 z cyklonowym separatorem pyłu.',
  'bvp-18-45': 'Płyta 450 mm do codziennej pracy na małych i średnich powierzchniach.',
  'bp-25-50': 'Płyta 500 mm i siła 25 kN, do piasku, żwiru i kostki brukowej.',
  'bp-25-50-d': 'Ta sama płyta 500 mm co w BP 25/50, z silnikiem diesla Hatz.',
  'bpr-25-50-d-stoneguard': 'Płyta STONEGUARD do kostki brukowej: ogranicza wyszczerbienia krawędzi i ilość odrzuconej kostki.',
  'bpr-35-60-d-stoneguard': 'Cięższa wersja STONEGUARD, z płytą 630 mm.',
  'bpr-55-65-d': 'Średnia klasa, 55 kN, do gruntu i kostki.',
  'bpr-60-65-d': 'Siła 60 kN przy płycie 650 mm, silnik Hatz 1B40.',
  'bpr-70-70-d': 'Płyta 700 mm i 70 kN do zagęszczania gruntu w trudnych warunkach.',
  'bpr-100-80-d': 'Największa zagęszczarka w ofercie: 100 kN i płyta 800 mm.',
  'bw-55': 'Najlżejszy walec w ofercie: pobocza, pasy przy krawężnikach, wykopy.',
  'bw-71-e-2': 'Bęben o średnicy 600 mm, do asfaltu i napraw nawierzchni.',
  'bw-65': 'Dwa bębny 650 mm, silnik benzynowy Honda GX 390 z rozrusznikiem elektrycznym.',
  'bw-65-d': 'Wersja BW 65 z silnikiem diesla Kohler. Minimalny występ bębna poza obrys pozwala zagęszczać do samej krawędzi.',
  'bmp-8500': 'Walec okołkowany do wykopów, kanałów i rurociągów, sterowany pilotem.',
  'bw-124-dh-5': 'Walec jednobębnowy do gruntu, na małe i średnie place budowy.',
  'bw-80-ad-5': 'Najwęższy walec tandemowy w ofercie, 800 mm: chodniki, alejki, ulice w mieście.',
  'bw-90-ad-5': 'Dwa bębny 900 mm, do chodników, alejek i przestrzeni miejskiej.',
  'bw-90-ac-5': 'Walec kombinowany 900 mm, silnik spełnia normę Stage V.',
  'bw-100-ad-5': 'Dwa bębny 1000 mm, do prac drogowych i remontowych.',
  'bw-100-ac-5': 'Walec kombinowany 1000 mm, do chodników, ścieżek i napraw asfaltu.',
  'bw-120-ad-5': 'Dwa bębny 1200 mm, do dróg, parkingów i placów manewrowych.',
  'bw-120-ac-5': 'Walec kombinowany 1200 mm, do chodników i prac wykończeniowych.',
  'bw-135-ad-5': 'Dwa bębny 1300 mm, do ścieżek, remontów i modernizacji nawierzchni.',
  'bw-138-ad-5': 'Najcięższy walec tandemowy w ofercie, bębny 1380 mm.',
  'bw-138-ac-5': 'Walec kombinowany 1380 mm, silnik spełnia normę Stage V.',
  sv15: 'Minikoparka Schaeff. Dane techniczne poda handlowiec.',
  sv17: 'Minikoparka Schaeff. Dane techniczne poda handlowiec.',
  sv22: 'Minikoparka Schaeff. Dane techniczne poda handlowiec.',
  tl80: 'Ładowarka kołowa z silnikiem Yanmar.',
  tw75: 'Koparka kołowa, głębokość kopania 3500 mm.',
  rt105: 'Najmniejszy model Gehl w ofercie, udźwig roboczy 476 kg.',
  rt135: 'Ładowarka gąsienicowa Gehl z silnikiem Yanmar 4TNV88.',
  rt165: 'Ładowarka gąsienicowa Gehl z silnikiem Yanmar 4TNV98C.',
  rt185: 'Ładowarka gąsienicowa Gehl, udźwig roboczy 839 kg.',
  rt215: 'Największy model Gehl w ofercie, udźwig roboczy 975 kg.',
};

// Zdjecie zastepcze z jawnym podpisem, gdy wlasne zdjecie modelu sie nie nadaje.
const ZDJECIA_ZASTEPCZE: Record<string, { zdjecie: string; podpis: string }> = {
  'bw-65-d': { zdjecie: 'maszyny/bw-65', podpis: 'Na zdjęciu BW 65, wersja z silnikiem benzynowym.' },
};

type Etykieta = { nazwa: string; jednostka?: string; zakres?: boolean };
const ETYKIETY: Record<string, Etykieta> = {
  masa_robocza_kg: { nazwa: 'Masa robocza', jednostka: 'kg' },
  szerokosc_robocza_mm: { nazwa: 'Szerokość robocza', jednostka: 'mm' },
  sila_odsrodkowa_kn: { nazwa: 'Siła odśrodkowa', jednostka: 'kN' },
  czestotliwosc_hz: { nazwa: 'Częstotliwość drgań', jednostka: 'Hz' },
  moc_kw: { nazwa: 'Moc silnika', jednostka: 'kW' },
  moc_brutto_kw: { nazwa: 'Moc silnika (brutto)', jednostka: 'kW' },
  naped: { nazwa: 'Napęd' },
  silnik: { nazwa: 'Silnik' },
  predkosc_m_min: { nazwa: 'Prędkość robocza', jednostka: 'm/min', zakres: true },
  predkosc_km_h: { nazwa: 'Prędkość jazdy', jednostka: 'km/h', zakres: true },
  predkosc_wstecz_km_h: { nazwa: 'Prędkość do tyłu', jednostka: 'km/h', zakres: true },
  predkosc_drugi_bieg_km_h: { nazwa: 'Prędkość na drugim biegu', jednostka: 'km/h', zakres: true },
  predkosc_opcjonalna_km_h: { nazwa: 'Prędkość jazdy (opcja)', jednostka: 'km/h' },
  glebokosc_kopania_mm: { nazwa: 'Głębokość kopania', jednostka: 'mm' },
  udzwig_nominalny_roc_35_kg: { nazwa: 'Udźwig roboczy (ROC 35%)', jednostka: 'kg' },
  udzwig_nominalny_roc_50_kg: { nazwa: 'Udźwig roboczy (ROC 50%)', jednostka: 'kg' },
};
// Kolejnosc w tabeli parametrow. moc_kw pomijamy, gdy jest moc brutto (Gehl podaje obie niespojnie).
const KOLEJNOSC = Object.keys(ETYKIETY);
const NAPEDY: Record<string, string> = { benzyna: 'Benzyna', diesel: 'Diesel', akumulator: 'Akumulator' };

export type Parametr = { klucz: string; nazwa: string; wartosc: string; dwieWartosci: boolean };

function formatuj(klucz: string, w: Wartosc): { tekst: string; dwie: boolean } | null {
  if (w === null || w === undefined || w === '') return null;
  const e = ETYKIETY[klucz];
  if (!e) return null;
  if (typeof w === 'string') return { tekst: klucz === 'naped' ? NAPEDY[w] ?? w : w, dwie: false };
  const j = e.jednostka ? ` ${e.jednostka}` : '';
  const zaokr = (n: number) => liczba(klucz.endsWith('_kg') && n > 100 ? Math.round(n) : n);
  if (Array.isArray(w)) {
    const [a, b] = w;
    if (a === b) return { tekst: `${zaokr(a)}${j}`, dwie: false };
    // Predkosci to zakresy (od-do), pozostale pary to dwie nastawy maszyny (np. amplituda I i II).
    return e.zakres ? { tekst: `${zaokr(a)}-${zaokr(b)}${j}`, dwie: false } : { tekst: `${zaokr(a)} / ${zaokr(b)}${j}`, dwie: true };
  }
  return { tekst: `${zaokr(w)}${j}`, dwie: false };
}

export type Model = {
  id: string;
  nazwa: string;
  kod: string;
  marka: string;
  kategoria: IdKategorii;
  opis: string;
  zdjecie: string;
  podpisZdjecia?: string;
  masa: number | null;
  parametry: Parametr[];
  karta: Parametr[];
  urlProducenta: string | null;
  kartaPdf: string | null;
  stareAdresy: string[];
  href: string;
};

export type Kategoria = Omit<DefinicjaKategorii, 'zrodla' | 'karta'> & {
  modele: Model[];
  href: string;
  zakresMasy: string | null;
};

const surowe = (zrodlo as unknown as { modele: ModelZrodlowy[] }).modele;

function zbudujModel(m: ModelZrodlowy, def: DefinicjaKategorii): Model {
  const p = m.parametry;
  const jestBrutto = p.moc_brutto_kw !== null && p.moc_brutto_kw !== undefined;
  const parametry: Parametr[] = KOLEJNOSC.filter((k) => !(k === 'moc_kw' && jestBrutto))
    .map((k) => ({ k, f: formatuj(k, p[k] ?? null) }))
    .filter((x): x is { k: string; f: { tekst: string; dwie: boolean } } => x.f !== null)
    .map(({ k, f }) => ({
      klucz: k,
      nazwa: k === 'szerokosc_robocza_mm' && def.id === 'stopy-wibracyjne' ? 'Szerokość stopy' : ETYKIETY[k].nazwa,
      wartosc: f.tekst,
      dwieWartosci: f.dwie,
    }));
  const masa = typeof p.masa_robocza_kg === 'number' ? p.masa_robocza_kg : Array.isArray(p.masa_robocza_kg) ? p.masa_robocza_kg[0] : null;
  const zastepcze = ZDJECIA_ZASTEPCZE[m.id];
  const kartaPdf = m.pdf.find((u) => u.includes('bomag.com') || u.includes('manitou') || u.includes('schaeff')) ?? null;
  return {
    id: m.id,
    nazwa: m.nazwa,
    kod: m.nazwa.replace(/^(BOMAG|Schaeff|GEHL)\s+/i, ''),
    marka: def.marka,
    kategoria: def.id,
    opis: OPISY[m.id] ?? '',
    zdjecie: zastepcze?.zdjecie ?? `maszyny/${m.id}`,
    podpisZdjecia: zastepcze?.podpis,
    masa,
    parametry,
    karta: def.karta.map((k) => parametry.find((x) => x.klucz === k)).filter((x): x is Parametr => Boolean(x)),
    urlProducenta: m.url_producenta,
    kartaPdf,
    stareAdresy: m.stare_adresy,
    href: `/oferta/${def.id}/${m.id}/`,
  };
}

export const kategorie: Kategoria[] = DEFINICJE.map((def) => {
  const modele = surowe
    .filter((m) => def.zrodla.includes(m.kategoria))
    .map((m) => zbudujModel(m, def))
    .sort((a, b) => (a.masa ?? Infinity) - (b.masa ?? Infinity) || a.kod.localeCompare(b.kod, 'pl'));
  const masy = modele.map((m) => m.masa).filter((x): x is number => x !== null);
  const zakresMasy = masy.length ? (Math.min(...masy) === Math.max(...masy) ? `${liczba(masy[0])} kg` : `${liczba(Math.min(...masy))}-${liczba(Math.max(...masy))} kg`) : null;
  const { zrodla: _z, karta: _k, ...reszta } = def;
  return { ...reszta, modele, href: `/oferta/${def.id}/`, zakresMasy };
});

export const modele: Model[] = kategorie.flatMap((k) => k.modele);

const brakujace = surowe.filter((m) => !modele.some((x) => x.id === m.id));
if (brakujace.length) throw new Error(`Modele bez kategorii: ${brakujace.map((m) => m.id).join(', ')}`);
const bezOpisu = modele.filter((m) => !m.opis);
if (bezOpisu.length) throw new Error(`Modele bez opisu: ${bezOpisu.map((m) => m.id).join(', ')}`);

export const kategoria = (id: string) => kategorie.find((k) => k.id === id);
