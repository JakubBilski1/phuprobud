// Uruchamiane jednorazowo w katalogu z adm1.geojson (Natural Earth 10m admin-1); wynik: src/data/teren.json.
// Upraszcza granice wojewodztw (Natural Earth 10m, domena publiczna) i rzutuje je
// na plaski uklad w kilometrach wokol srodka Polski. Wynik: maly JSON pod scene 3D.
import fs from 'node:fs';

const LAT0 = 52, LON0 = 19.4;
const KX = Math.cos((LAT0 * Math.PI) / 180) * 111.32, KY = 110.57;
const rzut = ([lon, lat]) => [+((lon - LON0) * KX).toFixed(2), +((lat - LAT0) * KY).toFixed(2)];

// Ramer-Douglas-Peucker na punktach juz w km
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let dmax = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(dx, dy) || 1);
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax <= eps) return [a, b];
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}

// Pierscien jest zamkniety (pierwszy == ostatni), wiec dzielimy go w punkcie najdalszym od startu.
function rdpPierscien(ring, eps) {
  let idx = 0, dmax = 0;
  ring.forEach((p, i) => { const d = Math.hypot(p[0] - ring[0][0], p[1] - ring[0][1]); if (d > dmax) { dmax = d; idx = i; } });
  return [...rdp(ring.slice(0, idx + 1), eps).slice(0, -1), ...rdp(ring.slice(idx), eps).slice(0, -1)];
}

const g = JSON.parse(fs.readFileSync('adm1.geojson', 'utf8'));
const woj = g.features
  .filter((f) => f.properties.adm0_a3 === 'POL')
  .map((f) => {
    const kod = f.properties.iso_3166_2;
    const nasz = kod === 'PL-WP' || kod === 'PL-KP';
    const ring = f.geometry.coordinates[0].map(rzut);
    return { kod, nazwa: f.properties.name_pl.replace('województwo ', ''), nasz, obrys: rdpPierscien(ring, nasz ? 1.2 : 2.5) };
  });

const miejsca = [
  { nazwa: 'Komorniki', lonlat: [16.8276582, 52.3447067], siedziba: true },
  { nazwa: 'Poznań', lonlat: [16.8999, 52.4058] },
  { nazwa: 'Bydgoszcz', lonlat: [18.01, 53.1204] },
  { nazwa: 'Toruń', lonlat: [18.5965831, 53.0145361] },
  { nazwa: 'Kalisz', lonlat: [18.079532, 51.7472867] },
  { nazwa: 'Piła', lonlat: [16.7380343, 53.1511306] },
  { nazwa: 'Konin', lonlat: [18.2521112, 52.2301933] },
  { nazwa: 'Włocławek', lonlat: [19.0961297, 52.6655636] },
  { nazwa: 'Leszno', lonlat: [16.5744141, 51.8436498] },
].map(({ lonlat, ...m }) => ({ ...m, xy: rzut(lonlat) }));

const wynik = { zrodlo: 'Natural Earth 10m admin-1 (domena publiczna), OpenStreetMap Nominatim', jednostka: 'km', srodek: [LON0, LAT0], wojewodztwa: woj, miejsca };
fs.writeFileSync('teren.json', JSON.stringify(wynik));
console.log('punkty:', woj.map((w) => `${w.kod}:${w.obrys.length}`).join(' '), '| bajty:', fs.statSync('teren.json').size);
