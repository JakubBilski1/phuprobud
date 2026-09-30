// Autorska mapa dojazdu na MapLibre: dane OpenStreetMap z OpenFreeMap (schemat OpenMapTiles),
// wlasny styl - zolty lad, biala woda, grafitowe drogi, czerwona pinezka Probudu.
import type * as MapLibre from 'maplibre-gl';
import type { Map as MapaMapLibre, StyleSpecification } from 'maplibre-gl';
import { version } from 'maplibre-gl/package.json';

// Pliki MapLibre podajemy jako statyczne zasoby (scripts/vendor.mjs), zeby worker znalazl sie obok.
const BAZA = `/vendor/maplibre-gl-${version}/`;

const ZOLTY = '#f6cf00';
const GRAFIT = '#222222';
const FONT = ['Noto Sans Bold'];
const FONT_ZWYKLY = ['Noto Sans Regular'];

// Szerokosc linii drog rosnie z przyblizeniem; wartosci w px dla zoomow 12 i 17.
const szerokosc = (z12: number, z17: number) => ['interpolate', ['exponential', 1.6], ['zoom'], 12, z12, 17, z17] as unknown as number;

const styl: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: { osm: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="https://openfreemap.org">OpenFreeMap</a>' } },
  layers: [
    { id: 'tlo', type: 'background', paint: { 'background-color': ZOLTY } },
    { id: 'zielen', type: 'fill', source: 'osm', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass']]], paint: { 'fill-color': '#e7c100' } },
    { id: 'zabudowa', type: 'fill', source: 'osm', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'industrial', 'commercial']]], paint: { 'fill-color': '#eec900' } },
    { id: 'woda', type: 'fill', source: 'osm', 'source-layer': 'water', paint: { 'fill-color': '#ffffff' } },
    { id: 'budynki', type: 'fill', source: 'osm', 'source-layer': 'building', minzoom: 14, paint: { 'fill-color': '#d9b500' } },
    { id: 'kolej', type: 'line', source: 'osm', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': GRAFIT, 'line-width': 1.2, 'line-dasharray': [3, 3] } },
    {
      id: 'drogi-male', type: 'line', source: 'osm', 'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': GRAFIT, 'line-opacity': 0.55, 'line-width': szerokosc(0.6, 6) },
    },
    {
      id: 'drogi-srednie', type: 'line', source: 'osm', 'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': GRAFIT, 'line-width': szerokosc(1.6, 12) },
    },
    {
      id: 'drogi-duze', type: 'line', source: 'osm', 'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['primary', 'trunk', 'motorway']]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': GRAFIT, 'line-width': szerokosc(3, 20) },
    },
    {
      id: 'nazwy-ulic', type: 'symbol', source: 'osm', 'source-layer': 'transportation_name', minzoom: 13,
      layout: { 'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 12, 'text-letter-spacing': 0.04 },
      paint: { 'text-color': GRAFIT, 'text-halo-color': ZOLTY, 'text-halo-width': 2 },
    },
    {
      id: 'miejscowosci', type: 'symbol', source: 'osm', 'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'suburb']]],
      layout: { 'text-field': ['upcase', ['get', 'name']], 'text-font': FONT, 'text-size': ['match', ['get', 'class'], 'city', 18, 'town', 15, 13], 'text-letter-spacing': 0.12 },
      paint: { 'text-color': GRAFIT, 'text-halo-color': ZOLTY, 'text-halo-width': 2.5 },
    },
    {
      id: 'numery', type: 'symbol', source: 'osm', 'source-layer': 'housenumber', minzoom: 17,
      layout: { 'text-field': ['get', 'housenumber'], 'text-font': FONT_ZWYKLY, 'text-size': 11 },
      paint: { 'text-color': GRAFIT },
    },
  ],
};

export async function uruchomMape(el: HTMLElement) {
  const lat = Number(el.dataset.lat), lng = Number(el.dataset.lng);
  if (!document.querySelector('link[data-maplibre]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${BAZA}maplibre-gl.css`;
    css.dataset.maplibre = '';
    document.head.append(css);
  }
  const { Map, Marker, NavigationControl, AttributionControl } = (await import(/* @vite-ignore */ `${BAZA}maplibre-gl.mjs`)) as typeof MapLibre;
  const waski = matchMedia('(max-width: 40rem)').matches;
  let mapa: MapaMapLibre;
  try {
    mapa = new Map({
      container: el,
      style: styl,
      center: [lng - (waski ? 0 : 0.012), lat + (waski ? 0 : 0.0015)],
      zoom: waski ? 13.4 : 14.2,
      minZoom: 9,
      maxZoom: 18,
      attributionControl: false,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': 'Użyj Ctrl i przewijania, żeby przybliżyć mapę',
        'CooperativeGesturesHandler.MacHelpText': 'Użyj ⌘ i przewijania, żeby przybliżyć mapę',
        'CooperativeGesturesHandler.MobileHelpText': 'Przesuwaj mapę dwoma palcami',
        'NavigationControl.ZoomIn': 'Przybliż',
        'NavigationControl.ZoomOut': 'Oddal',
      },
    });
  } catch {
    return; // brak WebGL: zostaje statyczne tlo i karta z adresem
  }
  mapa.addControl(new NavigationControl({ showCompass: false }), 'top-right');
  mapa.addControl(new AttributionControl({ compact: true }), 'bottom-right');

  const pinezka = document.createElement('div');
  pinezka.className = 'pinezka';
  pinezka.innerHTML = '<span class="pinezka__podpis">PHU Probud</span><span class="pinezka__znak"></span>';
  // Obrocony kwadrat wystaje ok. 10 px ponizej swojego pudelka - przesuwamy, zeby czubek wskazywal adres.
  new Marker({ element: pinezka, anchor: 'bottom', offset: [0, -10] }).setLngLat([lng, lat]).addTo(mapa);
}
