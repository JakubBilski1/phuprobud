// Lista zdjec do przygotowania przez scripts/obrazy.mjs.
// zrodlo: sciezka w zrodla/ (oryginaly/ albo wyciecia/), cel: klucz w manifescie i sciezka w public/img/.
// Realizacje: kolejnosc i podpisy sa w src/data/realizacje.ts. Numerowane pliki to zdjecia
// ze starej strony, nazwane opisowo przyszly od Probudu w pazdzierniku 2026.
const realizacje = [
  '02', '08', '09', '13', '14', '16', '17',
  'jcb-8025-zts', 'case-821g', 'case-koparko-ladowarka-1', 'case-koparko-ladowarka-2', 'merlo-roto-widly',
  'merlo-roto-45-21-kosz', 'merlo-roto-bok', 'bomag-bw-120-ad', 'bomag-bmp-8500', 'liugong',
  'atlas-150w', 'ladowarka-v80',
].map((n) => ({ zrodlo: `oryginaly/realizacje/${n}.jpg`, cel: `realizacje/${n}`, szerokosci: [320, 720, 1200, 1800] }));

export const lista = [...realizacje];

// Maszyny z katalogu: wyciecie z tla, jesli zdjecie producenta go nie mialo (scripts/wytnij-maszyny.py).
import fs from 'node:fs';
import path from 'node:path';
const K = path.resolve(import.meta.dirname, '..');
const wyciete = new Set(fs.readdirSync(path.join(K, 'zrodla', 'wyciecia', 'maszyny')).map((p) => p.replace(/\.png$/, '')));
const maszyny = fs.readdirSync(path.join(K, 'zrodla', 'oryginaly', 'katalog')).map((plik) => {
  const id = plik.replace(/\.[a-z]+$/, '');
  if (id === 'bw-65-d') return null; // zdjecie z ekipa na pierwszym planie - karta pokazuje BW 65 z podpisem
  return {
    zrodlo: wyciete.has(id) ? `wyciecia/maszyny/${id}.png` : `oryginaly/katalog/${plik}`,
    cel: `maszyny/${id}`,
    szerokosci: [360, 720, 1200],
    jakosc: 80,
    przytnij: true,
  };
}).filter(Boolean);

const hero = [{ zrodlo: 'oryginaly/katalog/bw-138-ac-5.png', cel: 'hero/bw-138-ac-5', szerokosci: [640, 1000, 1400, 1920], jakosc: 82, przytnij: true }];

const kategorie = fs.readdirSync(path.join(K, 'zrodla', 'oryginaly', 'kategorie')).map((plik) => ({
  zrodlo: `oryginaly/kategorie/${plik}`,
  cel: `kategorie/${plik.replace(/\.[a-z]+$/, '')}`,
  szerokosci: [720, 1200, 1800],
}));

// Tlo strony glownej (scena wygenerowana przez Codex, bez maszyn i ludzi): jeden wariant w rozmiarze
// oryginalu, bo na telefonie i tak jest powiekszane (kadr wyzszy niz ekran, patrz TloStrony.astro).
const tlo = [{ zrodlo: 'oryginaly/tlo/przekroj.png', cel: 'tlo/przekroj', szerokosci: [1024], jakosc: 72 }];

lista.push(...maszyny, ...hero, ...kategorie, ...tlo);
