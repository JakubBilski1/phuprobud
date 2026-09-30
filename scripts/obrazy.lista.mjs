// Lista zdjec do przygotowania przez scripts/obrazy.mjs.
// zrodlo: sciezka w zrodla/ (oryginaly/ albo wyciecia/), cel: klucz w manifescie i sciezka w public/img/.
const realizacje = Array.from({ length: 18 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0');
  return { zrodlo: `oryginaly/realizacje/${n}.jpg`, cel: `realizacje/${n}`, szerokosci: [320, 720, 1200, 1800] };
});

const ludzie = [
  { zrodlo: 'wyciecia/krzysztof-bilski.png', cel: 'ludzie/krzysztof-bilski', szerokosci: [420, 840, 1200], jakosc: 82 },
  // Kadr od polowy klatki piersiowej w gore; lewa krawedz tnie ramie, jak prawa u Krzysztofa (lustro przy szwie).
  { zrodlo: 'wyciecia/szymon-atraszkiewicz.png', cel: 'ludzie/szymon-atraszkiewicz', kadr: { left: 560, top: 250, width: 640, height: 550 }, szerokosci: [420, 640], jakosc: 84 },
];

export const lista = [...realizacje, ...ludzie];

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

lista.push(...maszyny, ...hero, ...kategorie);
