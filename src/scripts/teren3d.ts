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
// Kolejnosc ukladania etykiet: wczesniejsza wybiera miejsce pierwsza. Siedziba i Bydgoszcz
// ida najpierw, bo maja najmniej wolnego miejsca (pinezka, sasiedni Poznan i Torun).
const PRIORYTET = ['Komorniki', 'Bydgoszcz', 'Toruń', 'Kalisz', 'Poznań'];
// Miejsce etykiety wzgledem punktu; gora-lewo, gora-prawo itd.: nad (pod) punktem, wysunieta w bok.
type Strona = 'lewo' | 'prawo' | 'gora' | 'gora-lewo' | 'gora-prawo' | 'dol' | 'dol-lewo' | 'dol-prawo';
const WSZYSTKIE: Strona[] = ['gora', 'prawo', 'lewo', 'dol', 'gora-lewo', 'gora-prawo', 'dol-lewo', 'dol-prawo'];
// Kolejnosc prob miejsc dla kazdej etykiety (uklad szukany z nawrotami, patrz rysuj): kazda
// w kadrze, bez zaslaniania pinezki i innych etykiet. Zadna etykieta nie znika. Pierwsze
// pozycje to uklad z duzego ekranu; po nich etykieta moze wziac kazde inne z WSZYSTKIE.
const STRONY: Record<string, Strona[]> = {
  Komorniki: ['lewo', 'gora', 'gora-lewo', 'gora-prawo', 'prawo'],
  Bydgoszcz: ['lewo', 'gora-lewo', 'gora', 'gora-prawo', 'prawo', 'dol'],
  'Toruń': ['prawo', 'gora', 'gora-prawo', 'dol', 'lewo'],
  Kalisz: ['gora', 'dol', 'prawo', 'lewo'],
  'Poznań': ['gora', 'prawo', 'dol', 'lewo', 'gora-prawo'],
};
// Odstep etykiety siedziby od glowki pinezki, gdy stoi nad nia (px).
const ODSTEP_SIEDZIBY = 14;
// Szerokosc naszego terenu na ekranie: co najmniej 290 px albo 39% kadru (tyle ma na duzym
// ekranie), najwyzej 62% kadru. Mniejszy teren nie miesci pieciu etykiet obok siebie.
const TEREN_MIN_PX = 290;
const TEREN_UDZIAL = 0.39;
const TEREN_MAX_UDZIAL = 0.62;
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
    .sort((a, b) => PRIORYTET.indexOf(a.nazwa) - PRIORYTET.indexOf(b.nazwa))
    .map((m) => {
      const span = document.createElement('span');
      span.textContent = m.siedziba ? 'Komorniki: PHU Probud' : m.nazwa;
      if (m.siedziba) span.className = 'siedziba';
      warstwa?.append(span);
      // Wszystkie podpisane miasta leza na naszym terenie, wiec etykieta stoi nad wyzsza plyta.
      const h = m.siedziba ? WYS_NASZE + WYS_SLUPKA + 18 : WYS_NASZE + 2;
      return {
        span,
        punkt: doSceny(m.xy, h),
        strony: [...new Set([...(STRONY[m.nazwa] ?? []), ...WSZYSTKIE])],
        odstep: m.siedziba ? ODSTEP_SIEDZIBY : 0,
        ostatnia: null as Strona | null,
      };
    });

  type Prost = { l: number; t: number; w: number; h: number };
  let szer = 1, wys = 1;
  let przeciaganie = false;
  // Czy przy obecnym kacie etykiety mieszcza sie bez nakladania (obrot staje na granicy).
  let ukladDobry = true;
  const MARGINES = 4;
  const naEkran = (v: Vector3) => {
    const p = v.clone().project(kamera);
    return { x: ((p.x + 1) / 2) * szer, y: ((1 - p.y) / 2) * wys };
  };
  const prostokat = (s: Strona, x: number, y: number, w: number, h: number, odstep: number): Prost => {
    if (s === 'lewo') return { l: x - w - 8, t: y - h / 2, w, h };
    if (s === 'prawo') return { l: x + 8, t: y - h / 2, w, h };
    const l = s.endsWith('-lewo') ? x - w + 12 : s.endsWith('-prawo') ? x - 12 : x - w / 2;
    return { l, t: s.startsWith('dol') ? y + 6 : y - h - odstep, w, h };
  };
  // Pole czesci wspolnej dwoch prostokatow (z marginesem); 0, gdy sie nie stykaja.
  const nalozenie = (a: Prost, b: Prost, m = MARGINES) =>
    Math.max(0, Math.min(a.l + a.w, b.l + b.w) + m - Math.max(a.l, b.l)) *
    Math.max(0, Math.min(a.t + a.h, b.t + b.h) + m - Math.max(a.t, b.t));
  const pozaKadrem = (r: Prost) =>
    r.w * r.h -
    Math.max(0, Math.min(r.l + r.w, szer - MARGINES) - Math.max(r.l, MARGINES)) *
    Math.max(0, Math.min(r.t + r.h, wys - MARGINES) - Math.max(r.t, MARGINES));
  // Pinezka jako przeszkoda dla wszystkich etykiet (tez dla wlasnej), w docelowym rozmiarze (tez w trakcie wejscia,
  // zeby etykiety nie przeskakiwaly, gdy slupek wyrasta). Prostokat tylko na grubosc glowki,
  // bez marginesu: Komorniki leza 10 km od Poznania i szerszy zapas zabieralby mu cale otoczenie.
  const podstawaPinezki = doSceny(siedziba.xy, WYS_NASZE);
  const glowkaPinezki = doSceny(siedziba.xy, WYS_NASZE + WYS_SLUPKA + 6);
  const prostokatPinezki = (): Prost => {
    const d = naEkran(podstawaPinezki);
    const g = naEkran(glowkaPinezki);
    const r = 7;
    return { l: Math.min(g.x, d.x) - r, t: g.y - r, w: Math.abs(g.x - d.x) + 2 * r, h: d.y - g.y + r };
  };

  type Opcja = { s: Strona; r: Prost; kara: number };
  // Rysuje klatke i uklada etykiety; zwraca, czy uklad bez nakladania sie znalazl.
  const rysuj = (): boolean => {
    renderer.render(scena, kamera);
    const pin = prostokatPinezki();
    // Mozliwe miejsca kazdej etykiety w kolejnosci prob, z kara za wyjscie z kadru i za pinezke.
    // Przy obracaniu etykieta najpierw probuje poprzedniego miejsca, zeby nie skakala.
    const opcje: Opcja[][] = etykiety.map((e) => {
      const { x, y } = naEkran(e.punkt);
      const w = e.span.offsetWidth;
      const h = e.span.offsetHeight;
      const kolejnosc = przeciaganie && e.ostatnia ? [e.ostatnia, ...e.strony.filter((s) => s !== e.ostatnia)] : e.strony;
      return kolejnosc.map((s) => {
        const r = prostokat(s, x, y, w, h, e.odstep);
        return { s, r, kara: pozaKadrem(r) * 2 + nalozenie(r, pin, 0) };
      });
    });
    // Szukanie z nawrotami: pierwszy uklad, w ktorym kazda etykieta jest w kadrze, nie zaslania
    // pinezki i nie wchodzi na inna. Dla pieciu etykiet to najwyzej kilka tysiecy prob.
    const wybor: Opcja[] = [];
    const szukaj = (i: number): boolean => {
      if (i === opcje.length) return true;
      for (const o of opcje[i]) {
        if (o.kara >= 0.5) continue;
        let wolne = true;
        for (let j = 0; j < i && wolne; j++) wolne = nalozenie(o.r, wybor[j].r) < 0.5;
        if (!wolne) continue;
        wybor[i] = o;
        if (szukaj(i + 1)) return true;
      }
      return false;
    };
    // Gdy takiego ukladu nie ma: kazda etykieta po kolei bierze miejsce z najmniejszym
    // nalozeniem. Etykieta nigdy nie znika.
    const znaleziony = szukaj(0);
    if (!znaleziony) {
      opcje.forEach((lista, i) => {
        let najlepsza = lista[0];
        let min = Infinity;
        for (const o of lista) {
          let kara = o.kara;
          for (let j = 0; j < i; j++) kara += nalozenie(o.r, wybor[j].r);
          if (kara < min) { min = kara; najlepsza = o; }
        }
        wybor[i] = najlepsza;
      });
    }
    etykiety.forEach((e, i) => {
      const { s, r } = wybor[i];
      const l = Math.max(MARGINES, Math.min(szer - r.w - MARGINES, r.l));
      const t = Math.max(MARGINES, Math.min(wys - r.h - MARGINES, r.t));
      e.ostatnia = s;
      e.span.style.transform = `translate(${l}px, ${t}px)`;
    });
    return znaleziony;
  };

  // Zoom kamery (perspektywa bez zmian) dobrany do szerokosci kadru, zeby teren nie plywal
  // w malym rozmiarze na telefonie i tablecie. Liczony przy zmianie rozmiaru, nie przy obrocie.
  const obrysNaszych = wojewodztwa.filter((w) => w.nasz).flatMap((w) => w.obrys.map((xy) => doSceny(xy, WYS_NASZE)));
  const dobierzZoom = () => {
    kamera.zoom = 1;
    kamera.updateProjectionMatrix();
    ustawKamere();
    kamera.updateMatrixWorld();
    let min = Infinity, max = -Infinity;
    const p = new Vector3();
    for (const v of obrysNaszych) {
      p.copy(v).project(kamera);
      min = Math.min(min, p.x);
      max = Math.max(max, p.x);
    }
    const szerTerenu = ((max - min) / 2) * szer;
    const docelowa = Math.min(szer * TEREN_MAX_UDZIAL, Math.max(TEREN_MIN_PX, szer * TEREN_UDZIAL));
    kamera.zoom = Math.max(1, docelowa / szerTerenu);
    kamera.updateProjectionMatrix();
  };

  const dopasuj = () => {
    szer = el.clientWidth;
    wys = el.clientHeight;
    renderer.setSize(szer, wys, false);
    kamera.aspect = szer / wys;
    dobierzZoom();
    ustawKamere();
    ukladDobry = rysuj();
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
  // Na telefonie wezszy zakres: przy mocnym obrocie Poznan, Bydgoszcz i Torun ustawiaja sie
  // w jednej linii i ich etykiety nie mieszcza sie obok siebie w malym kadrze.
  const obrotMax = waski ? 0.45 : 0.75;
  let startX: number | null = null;
  let startObrot = obrot;
  const plotno = renderer.domElement;
  plotno.addEventListener('pointerdown', (e) => { startX = e.clientX; startObrot = obrot; przeciaganie = true; plotno.setPointerCapture(e.pointerId); });
  plotno.addEventListener('pointermove', (e) => {
    if (startX === null) return;
    const poprzedni = obrot;
    obrot = Math.max(-obrotMax, Math.min(obrotMax, startObrot - (e.clientX - startX) * 0.005));
    if (obrot === poprzedni) return;
    ustawKamere();
    const dobry = rysuj();
    // Obrot staje na ostatnim kacie, przy ktorym etykiety mieszcza sie bez nakladania
    // (na najmniejszych telefonach to mniej niz pelny zakres).
    if (!dobry && ukladDobry) {
      obrot = poprzedni;
      ustawKamere();
      rysuj();
      return;
    }
    ukladDobry = dobry;
  });
  const koniec = () => { startX = null; przeciaganie = false; };
  plotno.addEventListener('pointerup', koniec);
  plotno.addEventListener('pointercancel', koniec);
}
