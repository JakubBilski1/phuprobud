// Scena 3D terenu dealera: plyty wojewodztw wyciagniete w gore, wielkopolskie i kujawsko-pomorskie
// wyzej i na zolto, slupek nad Komornikami. Renderujemy tylko przy zmianie (obrot, wzrost plyt,
// zmiana rozmiaru) - bez petli, ktora grzalaby telefon.
import {
  AmbientLight, Box3, CylinderGeometry, DirectionalLight, EdgesGeometry, ExtrudeGeometry, Group,
  LineBasicMaterial, LineSegments, Mesh, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera,
  PlaneGeometry, Scene, ShadowMaterial, Shape, SphereGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';
import teren from '../data/teren.json';

type Woj = { kod: string; nazwa: string; nasz: boolean; obrys: [number, number][] };
type Miejsce = { nazwa: string; xy: [number, number]; siedziba?: boolean };

const WYS_NASZE = 26;
const WYS_INNE = 7;
const WYS_SLUPKA = 64;
const PODPISANE = ['Poznań', 'Bydgoszcz', 'Toruń', 'Kalisz'];
// Po ktorej stronie punktu stoi etykieta: sasiednie miasta (Bydgoszcz i Torun) rozsuwamy na boki.
const STRONA: Record<string, 'lewo' | 'prawo' | 'gora'> = { Bydgoszcz: 'lewo', 'Toruń': 'prawo', Komorniki: 'lewo' };
const PRZESUNIECIE = { gora: 'translate(-50%, -100%)', lewo: 'translate(calc(-100% - 8px), -50%)', prawo: 'translate(8px, -50%)' };
// Wspolrzedne mapy: x na wschod, y na polnoc (km). W scenie polnoc to -z, wysokosc to +y.
const doSceny = ([x, y]: [number, number], h = 0) => new Vector3(x, h, -y);

export function uruchomTeren(el: HTMLElement, { spokoj }: { spokoj: boolean }) {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch {
    return; // brak WebGL: zostaje mapa SVG
  }
  const waski = el.clientWidth < 560;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  el.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scena = new Scene();
  const mapa = new Group();
  scena.add(mapa);

  const wojewodztwa = teren.wojewodztwa as Woj[];
  const nasze: Mesh[] = [];
  const krawedzie = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
  for (const w of wojewodztwa) {
    const ksztalt = new Shape(w.obrys.map(([x, y]) => new Vector2(x, y)));
    const geo = new ExtrudeGeometry(ksztalt, { depth: w.nasz ? WYS_NASZE : WYS_INNE, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const mat = new MeshStandardMaterial({ color: w.nasz ? 0xf6cf00 : 0xd6d6cf, roughness: w.nasz ? 0.55 : 0.95, metalness: 0 });
    const plyta = new Mesh(geo, mat);
    plyta.castShadow = true;
    plyta.receiveShadow = true;
    plyta.add(new LineSegments(new EdgesGeometry(geo, 25), krawedzie));
    mapa.add(plyta);
    if (w.nasz) nasze.push(plyta);
  }

  const miejsca = teren.miejsca as Miejsce[];
  const siedziba = miejsca.find((m) => m.siedziba)!;
  const czerwien = new MeshStandardMaterial({ color: 0x881810, roughness: 0.45 });
  const slupek = new Mesh(new CylinderGeometry(3, 3, WYS_SLUPKA, 18), czerwien);
  const glowka = new Mesh(new SphereGeometry(8.5, 24, 16), czerwien);
  slupek.castShadow = glowka.castShadow = true;
  const pinezka = new Group();
  pinezka.add(slupek, glowka);
  slupek.position.y = WYS_SLUPKA / 2;
  glowka.position.y = WYS_SLUPKA + 6;
  pinezka.position.copy(doSceny(siedziba.xy, WYS_NASZE));
  mapa.add(pinezka);

  // Cien na niewidocznym podlozu: plyty „stoja” na tle sekcji.
  const podloze = new Mesh(new PlaneGeometry(3000, 3000), new ShadowMaterial({ opacity: 0.13 }));
  podloze.rotation.x = -Math.PI / 2;
  podloze.receiveShadow = true;
  scena.add(podloze);

  scena.add(new AmbientLight(0xffffff, 1.1));
  const slonce = new DirectionalLight(0xffffff, 2.2);
  slonce.position.set(-420, 620, 380);
  slonce.castShadow = true;
  slonce.shadow.mapSize.set(waski ? 1024 : 2048, waski ? 1024 : 2048);
  Object.assign(slonce.shadow.camera, { left: -520, right: 520, top: 520, bottom: -520, near: 10, far: 2000 });
  scena.add(slonce);

  // Kamera patrzy na srodek naszego terenu z poludnia, pod katem ok. 40 stopni.
  const pudlo = new Box3();
  nasze.forEach((m) => pudlo.expandByObject(m));
  const cel = pudlo.getCenter(new Vector3()).setY(0);
  const kamera = new PerspectiveCamera(waski ? 34 : 27, 1, 10, 5000);
  const odleglosc = waski ? 1180 : 1320;
  let obrot = 0.18;

  const ustawKamere = () => {
    kamera.position.set(cel.x + Math.sin(obrot) * odleglosc * 0.78, odleglosc * 0.68, cel.z + Math.cos(obrot) * odleglosc * 0.78);
    kamera.lookAt(cel.x, 0, cel.z - 20);
  };

  // Etykiety miast jako HTML nad plotnem: ostre na kazdym ekranie i czytelne dla tlumaczy stron.
  const warstwa = el.querySelector<HTMLElement>('[data-teren-etykiety]');
  const etykiety = miejsca
    .filter((m) => m.siedziba || PODPISANE.includes(m.nazwa))
    .map((m) => {
      const span = document.createElement('span');
      span.textContent = m.siedziba ? 'Komorniki: PHU Probud' : m.nazwa;
      if (m.siedziba) span.className = 'siedziba';
      warstwa?.append(span);
      // Wszystkie podpisane miasta leza na naszym terenie, wiec etykieta stoi nad wyzsza plyta.
      const h = m.siedziba ? WYS_NASZE + WYS_SLUPKA + 18 : WYS_NASZE + 2;
      return { span, punkt: doSceny(m.xy, h), przesuniecie: PRZESUNIECIE[STRONA[m.nazwa] ?? 'gora'] };
    });

  let szer = 1, wys = 1;
  const rysuj = () => {
    renderer.render(scena, kamera);
    for (const { span, punkt, przesuniecie } of etykiety) {
      const p = punkt.clone().project(kamera);
      span.style.transform = `translate(${((p.x + 1) / 2) * szer}px, ${((1 - p.y) / 2) * wys}px) ${przesuniecie}`;
    }
  };

  const dopasuj = () => {
    szer = el.clientWidth;
    wys = el.clientHeight;
    renderer.setSize(szer, wys, false);
    kamera.aspect = szer / wys;
    kamera.updateProjectionMatrix();
    ustawKamere();
    rysuj();
  };
  new ResizeObserver(dopasuj).observe(el);
  dopasuj();
  el.dataset['3d'] = '';
  el.parentElement?.querySelector<HTMLElement>('[data-teren-podpowiedz]')?.removeAttribute('hidden');

  // Jednorazowe wejscie: nasze plyty rosna z poziomu reszty kraju, potem wyrasta slupek.
  if (!spokoj) {
    const start = performance.now();
    const CZAS = 1500;
    const klatka = (t: number) => {
      const k = Math.min(1, (t - start) / CZAS);
      const e = 1 - Math.pow(1 - k, 3);
      const skala = WYS_INNE / WYS_NASZE + (1 - WYS_INNE / WYS_NASZE) * e;
      nasze.forEach((m) => (m.scale.y = skala));
      pinezka.position.y = WYS_NASZE * skala;
      pinezka.scale.setScalar(Math.min(1, Math.max(0.001, (k - 0.55) / 0.45)));
      rysuj();
      if (k < 1) requestAnimationFrame(klatka);
    };
    requestAnimationFrame(klatka);
  }

  // Obrot przeciaganiem w poziomie, w granicach, zeby teren nie zniknal za reszta kraju.
  let startX: number | null = null;
  let startObrot = obrot;
  const plotno = renderer.domElement;
  plotno.addEventListener('pointerdown', (e) => { startX = e.clientX; startObrot = obrot; plotno.setPointerCapture(e.pointerId); });
  plotno.addEventListener('pointermove', (e) => {
    if (startX === null) return;
    obrot = Math.max(-0.75, Math.min(0.75, startObrot - (e.clientX - startX) * 0.005));
    ustawKamere();
    rysuj();
  });
  const koniec = () => { startX = null; };
  plotno.addEventListener('pointerup', koniec);
  plotno.addEventListener('pointercancel', koniec);
}
