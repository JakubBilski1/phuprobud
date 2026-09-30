// MapLibre 6 to trzy moduly ESM (glowny, wspolny, worker), ktore szukaja sie nawzajem po
// sasiednich adresach (new URL('./maplibre-gl-worker.mjs', import.meta.url)). Po spakowaniu
// przez Vite worker ginie, wiec podajemy pliki bez zmian jako statyczne zasoby, w katalogu
// z numerem wersji. Uruchamiane przed `dev` i `build`; public/vendor/ jest poza gitem.
import fs from 'node:fs';
import path from 'node:path';

const K = path.resolve(import.meta.dirname, '..');
const zrodlo = path.join(K, 'node_modules', 'maplibre-gl');
const { version } = JSON.parse(fs.readFileSync(path.join(zrodlo, 'package.json'), 'utf8'));
const vendor = path.join(K, 'public', 'vendor');
const cel = path.join(vendor, `maplibre-gl-${version}`);

fs.rmSync(vendor, { recursive: true, force: true });
fs.mkdirSync(cel, { recursive: true });
for (const plik of ['maplibre-gl.mjs', 'maplibre-gl-shared.mjs', 'maplibre-gl-worker.mjs', 'maplibre-gl.css']) {
  fs.copyFileSync(path.join(zrodlo, 'dist', plik), path.join(cel, plik));
}
fs.copyFileSync(path.join(zrodlo, 'LICENSE.txt'), path.join(cel, 'LICENSE.txt'));
console.log(`MapLibre ${version} -> public/vendor/maplibre-gl-${version}/`);
