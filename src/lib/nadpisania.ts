// Zmiany z panelu demonstracyjnego /admin/. Zapis tylko w localStorage tej przegladarki:
// nikt inny ich nie widzi, a strona na serwerze zostaje bez zmian.
//
// Format: { wersja, zapisano, pola: { klucz: { w: nowa wartosc, o: oryginal } } }.
// Klucze: tekst:<klucz>, model:<id>:<pole>, kategoria:<id>:<pole>, osoba:<id>:<pole>,
// dzial:<id>:<pole>, finansowanie:<pole>, ogloszenie:<pole>. Oryginal jest potrzebny przy
// telefonach i e-mailach: te podmieniamy wszedzie, gdzie stary numer albo adres wystepuje.
import { odmiana, sierotki, telHref, telKrotki, liczba } from './tekst';

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
      if (pole === 'rola' || pole === 'tytul') ustawTekst(atr(`data-osoba-${pole}`, id), tekst, false);
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
}
