// Zakladki panelu /admin/: „Galeria realizacji” (kolejnosc, podpisy, podmiana, nowe i usuniete
// zdjecia) i „Zdjecia na stronie” (miejsca ze zdjeciem poza galeria). Stan kazdej czesci siedzi
// w ukrytym polu tekstowym panelu (data-pole, input type=text z atrybutem hidden: w type=hidden
// ustawienie value zmienia tez wartosc domyslna, czyli oryginal), wiec zapis, odrzucanie, licznik niezapisanych zmian i lista
// zmian na pulpicie dzialaja tak samo jak dla tekstow (src/scripts/panel.ts).
import { adresZdjecia, przygotujZdjecie, zapiszZdjecie, PREFIKS_IDB, PREFIKS_PLIKU, type PozycjaGalerii } from '../lib/zdjecia-demo';
import { odmiana } from '../lib/tekst';

type Info = { podpis: string; mini: string; sredni: string };
const ZDJEC: [string, string, string] = ['zdjęcie', 'zdjęcia', 'zdjęć'];
let katalog: Record<string, Info> = {};

const $ = <T extends Element = HTMLElement>(s: string, rodzic: ParentNode = document) => rodzic.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, rodzic: ParentNode = document) => [...rodzic.querySelectorAll<T>(s)];

/** Obrazek w edytorze: zdjecie strony (miniatura z manifestu) albo wgrane (blob z IndexedDB). */
function pokazZdjecie(img: HTMLImageElement, z: string, rozmiar: 'mini' | 'sredni') {
  img.dataset.z = z;
  if (z.startsWith(PREFIKS_IDB)) {
    img.removeAttribute('src');
    void adresZdjecia(z).then((adres) => { if (adres && img.dataset.z === z) img.src = adres; });
  } else {
    img.src = katalog[z]?.[rozmiar] ?? '';
  }
}

function zglos(el: HTMLElement | null, tekst: string) {
  if (!el) return;
  el.textContent = tekst;
  el.hidden = !tekst;
}

/** Zmniejsza plik z dysku i zapisuje go w IndexedDB; zwraca odnosnik „idb:<id>”. */
async function wgraj(plik: File): Promise<string> {
  if (!plik.type.startsWith('image/')) throw new Error(`„${plik.name}” nie jest zdjęciem.`);
  return zapiszZdjecie(await przygotujZdjecie(plik));
}
const powodBledu = (e: unknown) => (e instanceof Error && e.message.startsWith('„') ? e.message : 'Nie udało się zapisać zdjęcia w przeglądarce (np. tryb prywatny albo brak miejsca).');

/** Zmienia wartosc ukrytego pola i powiadamia panel (licznik zmian, pasek zapisu). */
function ustawPole(pole: HTMLInputElement, wartosc: string) {
  pole.value = wartosc;
  pole.dispatchEvent(new Event('input', { bubbles: true }));
}

function edytorGalerii() {
  const pole = $<HTMLInputElement>('[data-pole="galeria:uklad"]');
  if (!pole) return;
  const lista = $('[data-galeria-lista]')!;
  const usuniete = $('[data-galeria-usuniete]')!;
  const ramkaUsunietych = $('[data-galeria-usuniete-ramka]')!;
  const szablon = $<HTMLTemplateElement>('[data-szablon-galerii]')!;
  const szablonUsunietego = $<HTMLTemplateElement>('[data-szablon-usunietego]')!;
  const licznik = $('[data-galeria-licznik]')!;
  const bladGalerii = $('[data-galeria-blad]');
  const oryginal: PozycjaGalerii[] = JSON.parse(pole.defaultValue);
  let stan: PozycjaGalerii[] = [];
  let przeciagany = -1;

  const czytaj = () => {
    try { stan = JSON.parse(pole.value); } catch { stan = oryginal.map((p) => ({ ...p })); }
  };
  const zmien = (nowy: PozycjaGalerii[], przerysuj = true) => {
    stan = nowy;
    ustawPole(pole, JSON.stringify(stan));
    if (przerysuj) rysuj();
  };
  const przesun = (z: number, na: number) => {
    if (na < 0 || na >= stan.length || z === na) return;
    const nowy = [...stan];
    const [poz] = nowy.splice(z, 1);
    nowy.splice(na, 0, poz);
    zmien(nowy);
    // Fokus zostaje na tym samym przycisku przesunietego wiersza, zeby mozna bylo klikac dalej.
    lista.children[na]?.querySelector<HTMLButtonElement>(na < z ? '[data-w-gore]' : '[data-w-dol]')?.focus();
  };

  function wiersz(poz: PozycjaGalerii, i: number): HTMLElement {
    const el = szablon.content.firstElementChild!.cloneNode(true) as HTMLElement;
    $('[data-nr]', el)!.textContent = String(i + 1);
    pokazZdjecie($<HTMLImageElement>('[data-foto]', el)!, poz.z, 'mini');
    $('[data-znacznik-nowe]', el)!.hidden = !poz.z.startsWith(PREFIKS_IDB);

    const podpis = $<HTMLInputElement>('[data-podpis]', el)!;
    podpis.id = `galeria-podpis-${i}`;
    $<HTMLLabelElement>('[data-etykieta-podpisu]', el)!.htmlFor = podpis.id;
    podpis.value = poz.p;
    // Pisanie nie przerysowuje listy (fokus zostaje w polu), tylko aktualizuje stan.
    podpis.addEventListener('input', () => zmien(stan.map((p, j) => (j === i ? { ...p, p: podpis.value.trim() } : p)), false));

    const wGore = $<HTMLButtonElement>('[data-w-gore]', el)!;
    const wDol = $<HTMLButtonElement>('[data-w-dol]', el)!;
    wGore.disabled = i === 0;
    wDol.disabled = i === stan.length - 1;
    wGore.addEventListener('click', () => przesun(i, i - 1));
    wDol.addEventListener('click', () => przesun(i, i + 1));

    $<HTMLInputElement>('[data-podmien]', el)!.addEventListener('change', async (e) => {
      const plik = (e.target as HTMLInputElement).files?.[0];
      if (!plik) return;
      zglos(bladGalerii, '');
      try {
        const z = await wgraj(plik);
        zmien(stan.map((p, j) => (j === i ? { ...p, z } : p)));
      } catch (blad) {
        zglos(bladGalerii, powodBledu(blad));
      }
    });
    $<HTMLButtonElement>('[data-usun]', el)!.addEventListener('click', () => zmien(stan.filter((_, j) => j !== i)));

    // Przeciaganie tylko za uchwyt: pola tekstowe w wierszu zostaja zaznaczalne mysza.
    const uchwyt = $('[data-uchwyt]', el)!;
    uchwyt.addEventListener('pointerdown', () => { el.draggable = true; });
    el.addEventListener('dragstart', (e) => {
      przeciagany = i;
      el.classList.add('przeciagany');
      e.dataTransfer?.setData('text/plain', String(i));
    });
    el.addEventListener('dragend', () => {
      el.draggable = false;
      przeciagany = -1;
      $$('.cel-upuszczenia', lista).forEach((w) => w.classList.remove('cel-upuszczenia'));
      el.classList.remove('przeciagany');
    });
    el.addEventListener('dragover', (e) => {
      if (przeciagany < 0) return;
      e.preventDefault();
      el.classList.add('cel-upuszczenia');
    });
    el.addEventListener('dragleave', () => el.classList.remove('cel-upuszczenia'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      if (przeciagany >= 0) przesun(przeciagany, i);
    });
    return el;
  }

  function wierszUsuniety(poz: PozycjaGalerii): HTMLElement {
    const el = szablonUsunietego.content.firstElementChild!.cloneNode(true) as HTMLElement;
    pokazZdjecie($<HTMLImageElement>('[data-foto]', el)!, poz.z, 'mini');
    $('[data-nazwa]', el)!.textContent = poz.p;
    $<HTMLButtonElement>('[data-przywroc-zdjecie]', el)!.addEventListener('click', () => zmien([...stan, { ...poz }]));
    return el;
  }

  function rysuj() {
    licznik.textContent = odmiana(stan.length, ZDJEC);
    lista.replaceChildren(...stan.map(wiersz));
    // Usuniete to tylko zdjecia strony; zdjecie z dysku po usunieciu znika na dobre.
    const brakujace = oryginal.filter((o) => !stan.some((s) => s.z === o.z));
    usuniete.replaceChildren(...brakujace.map(wierszUsuniety));
    ramkaUsunietych.hidden = brakujace.length === 0;
  }

  $<HTMLInputElement>('[data-galeria-dodaj]')!.addEventListener('change', async (e) => {
    const pliki = [...((e.target as HTMLInputElement).files ?? [])];
    (e.target as HTMLInputElement).value = '';
    if (!pliki.length) return;
    zglos(bladGalerii, '');
    const nowe: PozycjaGalerii[] = [];
    for (const plik of pliki) {
      try {
        nowe.push({ z: await wgraj(plik), p: '' });
      } catch (blad) {
        zglos(bladGalerii, powodBledu(blad));
      }
    }
    if (nowe.length) {
      zmien([...stan, ...nowe]);
      lista.lastElementChild?.scrollIntoView({ block: 'center' });
      lista.lastElementChild?.querySelector<HTMLInputElement>('[data-podpis]')?.focus({ preventScroll: true });
    }
  });

  // Panel ustawia wartosc z zewnatrz (start, odrzucenie, przywrocenie oryginalu).
  pole.addEventListener('panel:ustawiono', () => { czytaj(); rysuj(); });
  czytaj();
  rysuj();
}

function edytoryMiejsc() {
  $$('[data-slot]').forEach((karta) => {
    const pole = $<HTMLInputElement>('[data-pole^="zdjecie:"]', karta)!;
    const podglad = $<HTMLImageElement>('[data-slot-podglad]', karta)!;
    const wybor = $<HTMLSelectElement>('[data-slot-wybor]', karta)!;
    const opis = $('[data-slot-opis]', karta)!;
    const blad = $('[data-slot-blad]', karta);
    const oryginal = karta.dataset.oryginal!;

    const rysuj = () => {
      const w = pole.value;
      const z = w.startsWith(PREFIKS_PLIKU) ? w.slice(PREFIKS_PLIKU.length) : w || oryginal;
      pokazZdjecie(podglad, z, 'sredni');
      wybor.value = w.startsWith(PREFIKS_IDB) ? 'dysk' : w;
      opis.textContent = !w ? 'Na stronie: oryginał' : w.startsWith(PREFIKS_IDB) ? 'Na stronie: zdjęcie wgrane z dysku' : `Na stronie: ${katalog[z]?.podpis ?? z} (z galerii)`;
    };
    const ustaw = (w: string) => {
      ustawPole(pole, w);
      rysuj();
    };
    wybor.addEventListener('change', () => { if (wybor.value !== 'dysk') ustaw(wybor.value); });
    $<HTMLInputElement>('[data-slot-plik]', karta)!.addEventListener('change', async (e) => {
      const plik = (e.target as HTMLInputElement).files?.[0];
      (e.target as HTMLInputElement).value = '';
      if (!plik) return;
      zglos(blad, '');
      try {
        ustaw(await wgraj(plik));
      } catch (b) {
        zglos(blad, powodBledu(b));
      }
    });
    pole.addEventListener('panel:ustawiono', rysuj);
    rysuj();
  });
}

/** Opis wartosci pol zdjec na liscie zmian (pulpit); null dla innych pol. */
export function opisWartosciZdjec(typ: string | undefined, w: string, o: string): string | null {
  if (typ === 'galeria') {
    try {
      const teraz = JSON.parse(w) as PozycjaGalerii[];
      const bylo = JSON.parse(o) as PozycjaGalerii[];
      const zDysku = teraz.filter((p) => p.z.startsWith(PREFIKS_IDB)).length;
      const czesci = [odmiana(teraz.length, ZDJEC)];
      if (zDysku) czesci.push(`w tym z dysku: ${zDysku}`);
      if (w !== o && teraz.length === bylo.length && !zDysku) czesci.push('zmieniona kolejność lub podpisy');
      return czesci.join(', ');
    } catch {
      return null;
    }
  }
  if (typ === 'zdjecie') {
    if (!w) return 'oryginał';
    if (w.startsWith(PREFIKS_IDB)) return 'zdjęcie z dysku';
    return `z galerii: ${katalog[w.slice(PREFIKS_PLIKU.length)]?.podpis ?? w}`;
  }
  return null;
}

export function uruchomZdjeciaPanelu() {
  const dane = $('[data-zdjecia-strony]')?.textContent;
  katalog = dane ? JSON.parse(dane) : {};
  edytorGalerii();
  edytoryMiejsc();
}
