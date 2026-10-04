// Zasoby marki do public/: logo Probud w wersji na jasne tlo (biale litery -> grafit,
// znak bez zmian), logotypy producentow i BPCE przyciete do tresci, w WebP.
import sharp from 'sharp';
import path from 'node:path';

const K = path.resolve(import.meta.dirname, '..');
const zr = (p) => path.join(K, 'zrodla', 'oryginaly', 'marki', p);
const cel = (p) => path.join(K, 'public', p);

// Logo Probud: 489x98, biale litery na przezroczystym tle.
const { data, info } = await sharp(zr('PROBUD_LOGO.webp')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const ciemne = Buffer.from(data);
for (let i = 0; i < ciemne.length; i += 4) {
  const [r, g, b] = [ciemne[i], ciemne[i + 1], ciemne[i + 2]];
  const jasnosc = (r + g + b) / 3, nasycenie = Math.max(r, g, b) - Math.min(r, g, b);
  if (jasnosc > 150 && nasycenie < 40) { ciemne[i] = 0x22; ciemne[i + 1] = 0x22; ciemne[i + 2] = 0x22; }
}
const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
await sharp(ciemne, raw).webp({ lossless: true }).toFile(cel('marka/probud-logo-ciemne.webp'));
await sharp(data, raw).webp({ lossless: true }).toFile(cel('marka/probud-logo-jasne.webp'));

// Logotypy partnerow: przyciecie bialego marginesu, wysokosc 120 px.
for (const [plik, wyj] of [['bomag.jpg', 'bomag'], ['bpce.jpg', 'bpce']]) {
  const m = await sharp(zr(plik)).flatten({ background: '#ffffff' }).trim({ background: '#ffffff', threshold: 20 })
    .resize({ height: 120, withoutEnlargement: true }).webp({ quality: 90 }).toFile(cel(`marki/${wyj}.webp`));
  console.log(wyj, m.width, m.height);
}
console.log('logo', info.width, info.height);
