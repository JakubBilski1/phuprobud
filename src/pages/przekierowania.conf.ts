// Przekierowania 301 ze starych adresow phuprobud.pl na nowa strukture, dla nginx.
// Generowane z danych katalogu przy kazdym buildzie, wiec nie rozjada sie z oferta.
// Dockerfile przenosi plik do konfiguracji nginx (nie jest podawany jako strona).
import type { APIRoute } from 'astro';
import { kategorie, modele } from '../data/katalog';

// Strony kategorii i inne adresy starej strony (w tym te, ktore juz wtedy dawaly 404).
const RECZNE: Record<string, string> = {
  '/bomag/': '/oferta/',
  '/v2/': '/oferta/schaeff/',
  '/zageszczarki/': '/oferta/',
  '/bomag-stopy-wibracyjne/': '/oferta/stopy-wibracyjne/',
  '/stopa-wibracyjna-bt60-bt65/': '/oferta/stopy-wibracyjne/',
  '/bomag-bp20-45-2/': '/oferta/stopy-wibracyjne/',
  '/bomag-zageszczarki-jednokierunkowe/': '/oferta/zageszczarki-jednokierunkowe/',
  '/bomag-zageszczarki-rewersyjne/': '/oferta/zageszczarki-rewersyjne/',
  '/zageszczarki-rewersyjne/': '/oferta/zageszczarki-rewersyjne/',
  '/bomag-walce-drogowe/': '/oferta/',
  '/phuprobud/bomag-walce-drogowe/': '/oferta/',
  '/bomag-walce-drogowe-2/': '/oferta/walce-tandemowe/',
  '/walce-do-5-ton/': '/oferta/walce-tandemowe/',
  '/schaeff-minikoparki/': '/oferta/walce-prowadzone/',
  '/gehl-ladowarki-gasienicowe/': '/oferta/gehl/',
  '/kategoria-produktu/ladowarki-przegubowe-teleskopowe/': '/oferta/',
  '/bomag-bw-90-ad/': '/oferta/walce-tandemowe/bw-90-ad-5/',
};

export const GET: APIRoute = () => {
  const mapa = new Map<string, string>(Object.entries(RECZNE));
  const kategorieStare = new Set(Object.keys(RECZNE));
  // Karty modeli: kazdy stary adres, ktory nie jest strona kategorii, prowadzi do nowej karty.
  for (const m of modele) {
    for (const url of m.stareAdresy) {
      const sciezka = new URL(url).pathname;
      if (!kategorieStare.has(sciezka) && !mapa.has(sciezka)) mapa.set(sciezka, m.href);
    }
  }
  // Martwe linki Gehl ze starej strony (np. /gehl-rt105/) dostaja prawdziwe karty.
  for (const m of kategorie.find((k) => k.id === 'gehl')?.modele ?? []) {
    mapa.set(`/gehl-${m.id}/`, m.href);
  }
  const linie = [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([stary, nowy]) => [
      `location = ${stary} { return 301 ${nowy}; }`,
      `location = ${stary.replace(/\/$/, '')} { return 301 ${nowy}; }`,
    ]);
  const tekst = `# Wygenerowane przez src/pages/przekierowania.conf.ts - nie edytuj recznie.\n${linie.join('\n')}\n`;
  return new Response(tekst, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
