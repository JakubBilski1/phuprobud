// Przygotowuje zdjecia do strony: WebP w kilku szerokosciach + manifest z wymiarami
// i kolorem dominujacym (tlo, zanim obraz sie wczyta). Uruchamiane lokalnie
// (`npm run obrazy`), wynik trafia do repozytorium. Build na serwerze niczego
// nie przelicza, bo dzieli pamiec z innymi aplikacjami.
//
// Lista zdjec: scripts/obrazy.lista.mjs. Zrodla: zrodla/oryginaly/ (poza gitem) i zrodla/wyciecia/.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { lista } from './obrazy.lista.mjs';

const KORZEN = path.resolve(import.meta.dirname, '..');
const ZRODLA = path.join(KORZEN, 'zrodla');
const WYJSCIE = path.join(KORZEN, 'public', 'img');
const MANIFEST = path.join(KORZEN, 'src', 'data', 'obrazy.json');

const hex = ({ r, g, b }) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

async function przetworz(pozycja) {
  const { zrodlo, cel, szerokosci = [640, 1024, 1600], jakosc = 76, kadr, tlo, przytnij = false, rozmycie } = pozycja;
  const plik = path.join(ZRODLA, zrodlo);
  let baza = sharp(plik, { failOn: 'none' }).rotate();
  if (kadr) baza = baza.extract(kadr);
  if (tlo) baza = baza.flatten({ background: tlo });
  // Rozmycie (sigma w pikselach zrodla) wbudowane w plik, zeby przegladarka nie liczyla go co klatke.
  if (rozmycie) baza = baza.blur(rozmycie);
  let bufor = await baza.toBuffer();
  // Wycinki maszyn maja rozne marginesy; po przycieciu maszyna wypelnia kadr tak samo w calym katalogu.
  if (przytnij) bufor = await sharp(bufor).trim({ threshold: 4 }).toBuffer();
  const meta = await sharp(bufor).metadata();
  const { dominant } = await sharp(bufor).stats();

  const warianty = [];
  // Szerokosci wieksze niz oryginal zastepuje jeden wariant w rozmiarze oryginalu.
  const zadane = [...new Set(szerokosci)].sort((a, b) => a - b);
  const szerokosciWyjscia = zadane.filter((w) => w < meta.width);
  if (zadane.some((w) => w >= meta.width)) szerokosciWyjscia.push(meta.width);
  for (const w of szerokosciWyjscia) {
    const szer = Math.min(w, meta.width);
    const nazwa = `${cel}-${szer}.webp`;
    const docelowy = path.join(WYJSCIE, nazwa);
    await fs.mkdir(path.dirname(docelowy), { recursive: true });
    await sharp(bufor).resize({ width: szer }).webp({ quality: jakosc, effort: 5 }).toFile(docelowy);
    warianty.push({ w: szer, src: `/img/${nazwa}` });
  }
  return [cel, { w: meta.width, h: meta.height, kolor: hex(dominant), alfa: Boolean(meta.hasAlpha), warianty }];
}

const wynik = {};
let bledy = 0;
for (const pozycja of lista) {
  try {
    const [klucz, dane] = await przetworz(pozycja);
    wynik[klucz] = dane;
    process.stdout.write('.');
  } catch (e) {
    bledy++;
    console.error(`\n${pozycja.zrodlo}: ${e.message}`);
  }
}
await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
await fs.writeFile(MANIFEST, JSON.stringify(wynik, null, 1) + '\n');
console.log(`\nzdjec: ${Object.keys(wynik).length}, bledow: ${bledy}`);
if (bledy) process.exit(1);
