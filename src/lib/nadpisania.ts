// Zmiany z panelu demonstracyjnego /admin/. Zapis tylko w localStorage tej przegladarki:
// nikt inny ich nie widzi, a strona na serwerze zostaje bez zmian.
//
// Format: { wersja, zapisano, pola: { klucz: { w: nowa wartosc, o: oryginal } } }.
// Klucze: tekst:<klucz>, model:<id>:<pole>, kategoria:<id>:<pole>, osoba:<id>:<pole>,
// dzial:<id>:<pole>, finansowanie:<pole>, ogloszenie:<pole>, galeria:uklad (JSON z kolejnoscia
// i podpisami), zdjecie:<slot> („plik:<klucz>” albo „idb:<id>”). Oryginal jest potrzebny przy
// telefonach i e-mailach: te podmieniamy wszedzie, gdzie stary numer albo adres wystepuje.
import { odmiana, sierotki, telHref, telKrotki, liczba } from './tekst';
import { adresZdjecia, PREFIKS_IDB, PREFIKS_PLIKU, type PozycjaGalerii } from './zdjecia-demo';

export const KLUCZ_MAGAZYNU = 'probud-demo-tresci';

export type Wartosc = string | boolean;
export type Zmiana = { w: Wartosc; o: Wartosc };
export type Zapis = { wersja: 1; zapisano: string; pola: Record<string, Zmiana> };

export function wczytaj(): Zapis | null {
  try {
    const surowy = localStorage.getItem(KLUCZ_MAGAZYNU);
    if (!surowy) return null;
    const zapis = JSON.parse(surowy) as Zapis;
    return zapis?.wersja === 1 && zapis.pola && typeof zapis.pola === 'object' ? zapis : null;
  } catch {
    return null;
  }
}

export function zapisz(pola: Record<string, Zmiana>): boolean {
  try {
    if (Object.keys(pola).length === 0) localStorage.removeItem(KLUCZ_MAGAZYNU);
    else localStorage.setItem(KLUCZ_MAGAZYNU, JSON.stringify({ wersja: 1, zapisano: new Date().toISOString(), pola } satisfies Zapis));
    return true;
  } catch {
    return false;
  }
}

export function wyczysc() {
  try { localStorage.removeItem(KLUCZ_MAGAZYNU); } catch { /* tryb prywatny: nic do czyszczenia */ }
}

const wszystkie = <T extends Element = HTMLElement>(selektor: string) => [...document.querySelectorAll<T>(selektor)];
const atr = (nazwa: string, wartosc: string) => `[${nazwa}="${CSS.escape(wartosc)}"]`;
const cyfry = (numer: string) => numer.replace(/[^\d+]/g, '');

function ukryj(el: Element) { el.classList.add('demo-ukryte'); }

/** Podmienia tekst w wezlach tekstowych elementu, bez ruszania ikon i struktury. */
function podmienTekst(el: Element, stary: string, nowy: string) {
  if (!stary || stary === nowy) return;
  const spacer = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let w = spacer.nextNode(); w; w = spacer.nextNode()) {
    if (w.nodeValue?.includes(stary)) w.nodeValue = w.nodeValue.split(stary).join(nowy);
  }
}

function podmienWAtrybutach(stary: string, nowy: string) {
  wszystkie('[aria-label]').forEach((el) => {
    const a = el.getAttribute('aria-label')!;
    if (a.includes(stary)) el.setAttribute('aria-label', a.split(stary).join(nowy));
  });
  // Formularz czyta dzialy z JSON-a w atrybucie; wartosci bez cudzyslowow, wiec wystarczy escape JSON.
  const bezpieczny = JSON.stringify(nowy).slice(1, -1);
  wszystkie('[data-dzialy]').forEach((el) => {
    el.dataset.dzialy = el.dataset.dzialy!.split(JSON.stringify(stary).slice(1, -1)).join(bezpieczny);
  });
}

function zmienTelefon(stary: string, nowy: string) {
  if (!stary || !nowy || cyfry(stary) === cyfry(nowy)) return;
  wszystkie<HTMLAnchorElement>(`a[href="${telHref(stary)}"]`).forEach((a) => {
    a.href = telHref(nowy);
    podmienTekst(a, telKrotki(stary), telKrotki(nowy));
  });
  wszystkie('[data-tel-tekst]').forEach((el) => podmienTekst(el, telKrotki(stary), telKrotki(nowy)));
  podmienWAtrybutach(telKrotki(stary), telKrotki(nowy));
}

function zmienEmail(stary: string, nowy: string) {
  if (!stary || !nowy || stary === nowy) return;
  wszystkie<HTMLAnchorElement>(`a[href="mailto:${stary}"]`).forEach((a) => {
    a.href = `mailto:${nowy}`;
    podmienTekst(a, stary, nowy);
  });
  wszystkie('[data-adres]').forEach((el) => podmienTekst(el, stary, nowy));
  podmienWAtrybutach(stary, nowy);
}

function ustawTekst(selektor: string, tekst: string, typografia = true) {
  wszystkie(selektor).forEach((el) => { el.textContent = typografia ? sierotki(tekst) : tekst; });
}

function uwaga(el: Element, tekst: string) {
  const p = document.createElement('p');
  p.className = 'demo-uwaga';
  p.textContent = tekst;
  el.prepend(p);
}

/** Zdjecie w miejscu na stronie (data-zdjecie-slot): z galerii („plik:”) albo wgrane w panelu („idb:”). */
function zastosujZdjecie(slot: string, wartosc: string) {
  wszystkie<HTMLImageElement>(atr('data-zdjecie-slot', slot)).forEach((img) => {
    if (wartosc.startsWith(PREFIKS_PLIKU)) {
      // Zdjecia galerii sa w HTML strony glownej razem z adresami wszystkich rozmiarow.
      const zrodlo = document.querySelector<HTMLImageElement>(`[data-galeria-zdjecie]${atr('data-plik', wartosc.slice(PREFIKS_PLIKU.length))}`);
      if (!zrodlo) return;
      img.srcset = zrodlo.dataset.srcset || zrodlo.srcset;
      img.src = zrodlo.dataset.src || zrodlo.src;
      img.alt = zrodlo.alt;
    } else if (wartosc.startsWith(PREFIKS_IDB)) {
      img.removeAttribute('srcset');
      img.alt = 'Zdjęcie maszyny';
      void adresZdjecia(wartosc).then((adres) => { if (adres) img.src = adres; });
    }
    img.style.backgroundColor = '';
  });
}

/** Galeria „Realizacje” w kolejnosci z panelu: podpisy, usuniete zdjecia, nowe zdjecia z dysku. */
function zastosujGalerie(json: string) {
  let uklad: PozycjaGalerii[];
  try { uklad = JSON.parse(json); } catch { return; }
  const korzen = document.querySelector<HTMLElement>('[data-galeria]');
  const scena = korzen?.querySelector<HTMLElement>('[data-galeria-scena]');
  const lista = korzen?.querySelector<HTMLElement>('[data-galeria-miniatury]');
  if (!korzen || !scena || !lista || !Array.isArray(uklad) || !uklad.length) return;

  const zdjecia = new Map(wszystkie<HTMLImageElement>('[data-galeria-zdjecie]').map((img) => [img.dataset.plik!, img]));
  const miniatury = new Map([...lista.querySelectorAll<HTMLLIElement>('li[data-plik]')].map((li) => [li.dataset.plik!, li]));
  const wzorZdjecia = [...zdjecia.values()][0];
  const wzorMiniatury = [...miniatury.values()][0];
  if (!wzorZdjecia || !wzorMiniatury) return;

  const nowe: { img: HTMLImageElement; li: HTMLLIElement; podpis: string }[] = [];
  for (const { z, p } of uklad) {
    const podpis = p.trim() || 'Zdjęcie realizacji';
    let img = zdjecia.get(z);
    let li = miniatury.get(z);
    if (img && li) {
      zdjecia.delete(z);
      miniatury.delete(z);
    } else if (z.startsWith(PREFIKS_IDB)) {
      img = wzorZdjecia.cloneNode() as HTMLImageElement;
      ['src', 'srcset', 'data-src', 'data-srcset', 'loading', 'style', 'class'].forEach((a) => img!.removeAttribute(a));
      li = wzorMiniatury.cloneNode(true) as HTMLLIElement;
      const mini = li.querySelector('img')!;
      mini.removeAttribute('src');
      mini.style.backgroundColor = '';
      img.dataset.plik = li.dataset.plik = z;
      const duze = img;
      void adresZdjecia(z).then((adres) => { if (adres) { duze.src = adres; mini.src = adres; } });
    } else {
      continue;
    }
    img.alt = podpis;
    nowe.push({ img, li, podpis });
  }
  if (!nowe.length) return;

  // Zdjecia usuniete w panelu znikaja razem z miniaturami.
  zdjecia.forEach((img) => img.remove());
  miniatury.forEach((li) => li.remove());
  const przyciskPelny = scena.querySelector('[data-galeria-pelny]');
  nowe.forEach(({ img, li, podpis }, i) => {
    scena.insertBefore(img, przyciskPelny);
    lista.append(li);
    img.dataset.galeriaZdjecie = String(i);
    img.classList.toggle('aktywne', i === 0);
    const b = li.querySelector('button')!;
    b.dataset.galeriaIdz = String(i);
    b.setAttribute('aria-label', `Zdjęcie ${i + 1} z ${nowe.length}: ${podpis}`);
    if (i === 0) b.setAttribute('aria-current', 'true');
    else b.removeAttribute('aria-current');
  });
  // Pierwsze zdjecie musi byc wczytane od razu; reszte galeria dociaga w trakcie przegladania.
  const pierwsze = nowe[0].img;
  if (!pierwsze.getAttribute('src') && pierwsze.dataset.src) {
    pierwsze.srcset = pierwsze.dataset.srcset ?? '';
    pierwsze.src = pierwsze.dataset.src;
  }
  const razem = korzen.querySelector('[data-galeria-razem]');
  if (razem) razem.textContent = String(nowe.length);
  const podpis = korzen.querySelector('[data-galeria-podpis]');
  if (podpis) podpis.textContent = nowe[0].podpis;
}

type ModelKatalogu = [id: string, kategoria: string, masa: number | null];

/** Liczby modeli i zakresy masy po ukryciu modeli albo grup. */
function przeliczKatalog(ukryteModele: Set<string>, ukryteKategorie: Set<string>) {
  const zrodlo = document.querySelector('[data-katalog-demo]');
  if (!zrodlo?.textContent) return;
  const katalog = (JSON.parse(zrodlo.textContent) as ModelKatalogu[])
    .filter(([id, k]) => !ukryteModele.has(id) && !ukryteKategorie.has(k));
  const MODEL: [string, string, string] = ['model', 'modele', 'modeli'];

  wszystkie('[data-licznik-kategorii]').forEach((el) => {
    el.textContent = odmiana(katalog.filter(([, k]) => k === el.dataset.licznikKategorii).length, MODEL);
  });
  wszystkie('[data-zakres-masy]').forEach((el) => {
    const masy = katalog.filter(([, k, m]) => k === el.dataset.zakresMasy && m !== null).map(([, , m]) => m!);
    if (!masy.length) { ukryj(el.closest('[data-zakres-masy-opis]') ?? el); return; }
    const [od, doo] = [Math.min(...masy), Math.max(...masy)];
    el.textContent = od === doo ? `${liczba(od)} kg` : `${liczba(od)}-${liczba(doo)} kg`;
  });
  wszystkie('[data-licznik-modeli]').forEach((el) => { el.textContent = odmiana(katalog.length, MODEL); });
  const grupy = new Set(katalog.map(([, k]) => k)).size;
  wszystkie('[data-licznik-grup]').forEach((el) => { el.textContent = `w ${grupy} ${grupy === 1 ? 'grupie' : 'grupach'}`; });

  // Podglad na stronie glownej: jesli aktywna grupa zniknela, pokazujemy pierwsza widoczna.
  wszystkie('[data-oferta]').forEach((uklad) => {
    const aktywny = uklad.querySelector('.podglad.aktywny');
    if (!aktywny?.classList.contains('demo-ukryte')) return;
    const pierwszy = uklad.querySelector<HTMLElement>('[data-podglad-panel]:not(.demo-ukryte)');
    if (!pierwszy) return;
    uklad.querySelectorAll('[data-podglad-panel]').forEach((p) => p.classList.toggle('aktywny', p === pierwszy));
    uklad.querySelectorAll('[data-podglad]').forEach((w) => w.toggleAttribute('aria-current', false));
    uklad.querySelector(`[data-podglad="${pierwszy.dataset.podgladPanel}"]`)?.setAttribute('aria-current', 'true');
  });
}

export function zastosuj(pola: Record<string, Zmiana>) {
  const ukryteModele = new Set<string>();
  const ukryteKategorie = new Set<string>();

  for (const [klucz, { w, o }] of Object.entries(pola)) {
    const [typ, id, pole] = klucz.split(':');
    const tekst = typeof w === 'string' ? w : '';
    const oryginal = typeof o === 'string' ? o : '';

    if (typ === 'tekst') ustawTekst(atr('data-tresc', id), tekst);

    if (typ === 'model') {
      if (pole === 'widoczny' && w === false) {
        ukryteModele.add(id);
        wszystkie(atr('data-model', id)).forEach(ukryj);
      }
      if (pole === 'opis') ustawTekst(atr('data-model-opis', id), tekst);
      if (pole === 'etykieta' || pole === 'cena') {
        wszystkie(atr(`data-model-${pole}`, id)).forEach((el) => {
          el.textContent = tekst;
          el.hidden = !tekst;
        });
      }
    }

    if (typ === 'kategoria') {
      if (pole === 'widoczna' && w === false) {
        ukryteKategorie.add(id);
        wszystkie(atr('data-kategoria', id)).forEach(ukryj);
      }
      if (pole === 'nazwa') ustawTekst(atr('data-kategoria-nazwa', id), tekst, false);
      if (pole === 'opis') ustawTekst(atr('data-kategoria-opis', id), tekst);
    }

    if (typ === 'osoba') {
      if (pole === 'imie') {
        ustawTekst(atr('data-osoba-imie', id), tekst, false);
        ustawTekst(atr('data-osoba-imie-krotkie', id), tekst.split(/\s+/)[0], false);
      }
      if (pole === 'rola') ustawTekst(atr('data-osoba-rola', id), tekst, false);
      if (pole === 'telefon') zmienTelefon(oryginal, tekst);
    }

    if (typ === 'dzial' || typ === 'finansowanie') {
      const nazwaPola = typ === 'dzial' ? pole : id;
      if (nazwaPola === 'telefon') zmienTelefon(oryginal, tekst);
      if (nazwaPola === 'email') zmienEmail(oryginal, tekst);
      if (typ === 'finansowanie' && id === 'osoba') ustawTekst('[data-finansowanie-osoba]', tekst, false);
    }
  }

  // Ogloszenie: pasek jest w kazdej stronie (ukryty), panel wlacza go i ustawia tresc.
  const pasek = document.querySelector<HTMLElement>('[data-ogloszenie]');
  if (pasek && pola['ogloszenie:wlaczone']?.w === true) {
    const tekst = String(pola['ogloszenie:tekst']?.w ?? '');
    const link = String(pola['ogloszenie:link']?.w ?? '');
    const tresc = pasek.querySelector<HTMLElement>('[data-ogloszenie-tekst]')!;
    tresc.textContent = sierotki(tekst);
    const a = pasek.querySelector<HTMLAnchorElement>('[data-ogloszenie-link]')!;
    if (link) { a.href = link; a.hidden = false; }
    pasek.hidden = !tekst;
  }

  // Podstrona ukrytego modelu albo grupy: dla klienta nie istnieje, w demo mowimy to wprost.
  wszystkie('[data-strona-modelu]').forEach((el) => {
    if (ukryteModele.has(el.dataset.stronaModelu!)) uwaga(el, 'Ten model jest ukryty w panelu. Nie ma go w ofercie ani w katalogu, a odwiedzający zobaczyłby w tym miejscu stronę „nie znaleziono”.');
  });
  wszystkie('[data-strona-kategorii]').forEach((el) => {
    if (ukryteKategorie.has(el.dataset.stronaKategorii!)) uwaga(el, 'Ta grupa maszyn jest ukryta w panelu. Nie ma jej w menu oferty ani w katalogu.');
  });

  if (ukryteModele.size || ukryteKategorie.size) przeliczKatalog(ukryteModele, ukryteKategorie);

  // Zdjecia: najpierw miejsca na stronie (moga brac zdjecie z galerii), potem sama galeria.
  for (const [klucz, { w }] of Object.entries(pola)) {
    const [typ, id] = klucz.split(':');
    if (typ === 'zdjecie' && typeof w === 'string' && w) zastosujZdjecie(id, w);
  }
  const galeria = pola['galeria:uklad']?.w;
  if (typeof galeria === 'string') zastosujGalerie(galeria);
}
