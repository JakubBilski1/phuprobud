// Panel demonstracyjny /admin/: logowanie bez serwera, edycja pol i zapis roznicy wzgledem
// oryginalu w localStorage. Oryginal to wartosc z HTML (defaultValue / defaultChecked),
// wiec panel nie potrzebuje osobnej kopii danych strony.
import { wczytaj, zapisz, wyczysc, type Wartosc, type Zmiana } from '../lib/nadpisania';
import { odmiana } from '../lib/tekst';
import { odnosnikiIdb, posprzataj } from '../lib/zdjecia-demo';
import { opisWartosciZdjec } from './panel-zdjecia';
import { przygotujLogowanie } from './panel-konto';
import { sprawdzLogowanie } from '../lib/konto-demo';

// Logowanie bez serwera (src/lib/konto-demo.ts): dane startowe albo haslo ustawione w zakladce
// „Konto i haslo”. Zmiany i tak zostaja w przegladarce osoby, ktora je wpisala.
const SESJA = 'probud-panel-sesja';

type Pole = HTMLInputElement | HTMLTextAreaElement;

const $ = <T extends Element = HTMLElement>(s: string, rodzic: ParentNode = document) => rodzic.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, rodzic: ParentNode = document) => [...rodzic.querySelectorAll<T>(s)];

const czyPrzelacznik = (p: Pole): p is HTMLInputElement => p instanceof HTMLInputElement && p.type === 'checkbox';
const oryginal = (p: Pole): Wartosc => (czyPrzelacznik(p) ? p.defaultChecked : p.defaultValue);
const wartosc = (p: Pole): Wartosc => (czyPrzelacznik(p) ? p.checked : p.value.trim());
const ustaw = (p: Pole, w: Wartosc) => {
  if (czyPrzelacznik(p)) p.checked = w === true;
  else p.value = String(w);
  // Edytory zdjec (pola z atrybutem hidden) przerysowuja sie, gdy panel zmieni wartosc z zewnatrz.
  p.dispatchEvent(new CustomEvent('panel:ustawiono'));
};
// Wgrane zdjecia, do ktorych nie prowadzi juz zaden zapis, znikaja z IndexedDB.
const sprzatnijZdjecia = (pola: Record<string, Zmiana>) => void posprzataj(odnosnikiIdb(Object.values(pola).map((z) => z.w)));
const klucz = (p: Pole) => p.dataset.pole!;

function sesja(wlacz?: boolean): boolean {
  try {
    if (wlacz === true) sessionStorage.setItem(SESJA, '1');
    if (wlacz === false) sessionStorage.removeItem(SESJA);
    return sessionStorage.getItem(SESJA) === '1';
  } catch {
    return false;
  }
}

export function uruchomPanel() {
  const logowanie = $('[data-logowanie]')!;
  const panel = $('[data-panel]')!;
  const pola = $$<Pole>('[data-pole]');
  const poKluczu = new Map(pola.map((p) => [klucz(p), p]));
  const przywracanie = new Map($$<HTMLButtonElement>('[data-przywroc]').map((b) => [b.dataset.przywroc!, b]));
  const sekcje = $$('[data-sekcja]');

  let zapisane: Record<string, Zmiana> = {};
  const stanZapisany = (p: Pole): Wartosc => (klucz(p) in zapisane ? zapisane[klucz(p)].w : oryginal(p));

  // ---------- Logowanie ----------
  const formLogowania = $<HTMLFormElement>('[data-form-logowania]')!;
  const bladLogowania = $('[data-blad-logowania]')!;
  const przyciskLogowania = $<HTMLButtonElement>('[data-przycisk-logowania]')!;

  const pokazPanel = () => {
    logowanie.hidden = true;
    panel.hidden = false;
    zHasha();
  };
  formLogowania.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dane = new FormData(formLogowania);
    bladLogowania.hidden = true;
    przyciskLogowania.disabled = true;
    przyciskLogowania.textContent = 'Logowanie…';
    // Krotka pauza jak przy prawdziwym logowaniu, zeby przejscie nie bylo skokiem.
    const [ok] = await Promise.all([
      sprawdzLogowanie(String(dane.get('login') ?? '').trim(), String(dane.get('haslo') ?? '')),
      new Promise((r) => setTimeout(r, 450)),
    ]);
    przyciskLogowania.disabled = false;
    przyciskLogowania.textContent = 'Zaloguj się';
    if (!ok) {
      bladLogowania.textContent = 'Nieprawidłowy login lub hasło.';
      bladLogowania.hidden = false;
      return;
    }
    sesja(true);
    pokazPanel();
  });
  $('[data-wyloguj]')!.addEventListener('click', () => {
    odrzuc();
    sesja(false);
    panel.hidden = true;
    logowanie.hidden = false;
    przygotujLogowanie();
    history.replaceState(null, '', location.pathname);
  });

  // ---------- Nawigacja ----------
  function pokazSekcje(id: string) {
    sekcje.forEach((s) => { s.hidden = s.dataset.sekcja !== id; });
    $$('[data-link-sekcji]').forEach((a) => a.toggleAttribute('aria-current', false));
    $(`[data-link-sekcji="${id}"]`)?.setAttribute('aria-current', 'page');
  }
  function zHasha() {
    const id = location.hash.slice(1);
    pokazSekcje(sekcje.some((s) => s.dataset.sekcja === id) ? id : 'pulpit');
    scrollTo(0, 0);
  }
  addEventListener('hashchange', zHasha);

  // Pokazuje pole w jego sekcji, rozwija schowany opis i ustawia na nim fokus.
  function idzDoPola(p: Pole) {
    const sekcja = p.closest<HTMLElement>('[data-sekcja]')!.dataset.sekcja!;
    if (location.hash !== `#${sekcja}`) history.pushState(null, '', `#${sekcja}`);
    pokazSekcje(sekcja);
    const schowany = p.closest<HTMLElement>('[hidden]');
    if (schowany) $<HTMLButtonElement>(`[aria-controls="${schowany.id}"]`)?.click();
    // Ukryte pole (galeria, zdjecia) nie ma wlasnego miejsca na stronie: przewijamy do jego karty.
    const cel = p.hidden ? p.closest<HTMLElement>('[data-pole-ramka]') ?? p : p;
    cel.scrollIntoView({ block: p.hidden ? 'start' : 'center' });
    if (!p.hidden) p.focus({ preventScroll: true });
  }

  // Rozwijane opisy grup i modeli
  $$<HTMLButtonElement>('[data-rozwin]').forEach((b) => {
    b.addEventListener('click', () => {
      const cel = document.getElementById(b.getAttribute('aria-controls')!)!;
      const otwarte = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(otwarte));
      cel.hidden = !otwarte;
    });
  });

  // ---------- Walidacja ----------
  function blad(p: Pole): string {
    if (czyPrzelacznik(p)) return '';
    const v = p.value.trim();
    if (klucz(p) === 'ogloszenie:tekst' && !v && poKluczu.get('ogloszenie:wlaczone')?.matches(':checked')) {
      return 'Włączone ogłoszenie musi mieć treść.';
    }
    if (p.required && !v) return 'To pole nie może być puste.';
    if (!v) return '';
    const typ = p.dataset.typ;
    if (typ === 'telefon' && v.replace(/\D/g, '').length < 9) return 'Numer ma za mało cyfr.';
    if (typ === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Adres e-mail wygląda na niepełny.';
    if (typ === 'link' && !/^(\/|https?:\/\/)\S*$/.test(v)) return 'Link zaczyna się od / albo od https://.';
    return '';
  }
  function pokazBlad(p: Pole, tekst: string) {
    const el = $(`[data-blad-pola="${CSS.escape(klucz(p))}"]`);
    if (el) { el.textContent = tekst; el.hidden = !tekst; }
    p.setAttribute('aria-invalid', tekst ? 'true' : 'false');
  }

  // ---------- Komunikaty ----------
  const komunikat = $('[data-komunikat]')!;
  let czasKomunikatu = 0;
  function powiedz(tekst: string, { rodzaj = 'ok', link }: { rodzaj?: 'ok' | 'blad'; link?: [string, string] } = {}) {
    komunikat.replaceChildren(document.createTextNode(tekst));
    if (link) {
      const a = document.createElement('a');
      a.href = link[0];
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = link[1];
      komunikat.append(document.createElement('br'), a);
    }
    komunikat.classList.toggle('blad', rodzaj === 'blad');
    komunikat.hidden = false;
    clearTimeout(czasKomunikatu);
    czasKomunikatu = window.setTimeout(() => { komunikat.hidden = true; }, 5000);
  }

  // ---------- Zapis ----------
  function zapiszZmiany() {
    const bledne = pola.filter((p) => {
      const b = blad(p);
      pokazBlad(p, b);
      return Boolean(b);
    });
    if (bledne.length) {
      powiedz(`Popraw ${odmiana(bledne.length, ['zaznaczone pole', 'zaznaczone pola', 'zaznaczonych pól'])}, zanim zapiszesz.`, { rodzaj: 'blad' });
      idzDoPola(bledne[0]);
      return;
    }
    const nowe: Record<string, Zmiana> = {};
    for (const p of pola) {
      if (!czyPrzelacznik(p)) p.value = p.value.trim();
      const w = wartosc(p);
      const o = oryginal(p);
      if (w !== o) nowe[klucz(p)] = { w, o };
    }
    if (!zapisz(nowe)) {
      powiedz('Nie udało się zapisać: przeglądarka blokuje zapis danych strony (np. tryb prywatny).', { rodzaj: 'blad' });
      return;
    }
    zapisane = nowe;
    sprzatnijZdjecia(zapisane);
    odswiez();
    powiedz('Zapisano. Zmiany są już widoczne na stronie w tej przeglądarce.', { link: ['/', 'Otwórz stronę'] });
  }

  function odrzuc() {
    pola.forEach((p) => {
      ustaw(p, stanZapisany(p));
      pokazBlad(p, '');
    });
    odswiez();
  }

  $('[data-zapisz]')!.addEventListener('click', zapiszZmiany);
  $('[data-odrzuc]')!.addEventListener('click', () => {
    odrzuc();
    powiedz('Odrzucono niezapisane zmiany.');
  });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !panel.hidden) {
      e.preventDefault();
      zapiszZmiany();
    }
  });
  addEventListener('beforeunload', (e) => {
    if (!panel.hidden && pola.some((p) => wartosc(p) !== stanZapisany(p))) e.preventDefault();
  });

  // Przywracanie oryginalu: pojedyncze pole, caly wiersz modelu, cala strona
  przywracanie.forEach((b, k) => b.addEventListener('click', () => {
    const p = poKluczu.get(k)!;
    ustaw(p, oryginal(p));
    pokazBlad(p, '');
    odswiez();
    p.focus();
  }));
  $$<HTMLButtonElement>('[data-przywroc-wiersz]').forEach((b) => b.addEventListener('click', () => {
    $$<Pole>('[data-pole]', b.closest('[data-wiersz-modelu]')!).forEach((p) => { ustaw(p, oryginal(p)); pokazBlad(p, ''); });
    odswiez();
  }));
  const przyciskWszystko = $<HTMLButtonElement>('[data-przywroc-wszystko]')!;
  przyciskWszystko.addEventListener('click', () => {
    if (!przyciskWszystko.dataset.potwierdz) {
      przyciskWszystko.dataset.potwierdz = '1';
      przyciskWszystko.textContent = 'Na pewno? Kliknij jeszcze raz';
      return;
    }
    delete przyciskWszystko.dataset.potwierdz;
    przyciskWszystko.textContent = 'Przywróć całą stronę do oryginału';
    wyczysc();
    zapisane = {};
    sprzatnijZdjecia(zapisane);
    pola.forEach((p) => { ustaw(p, oryginal(p)); pokazBlad(p, ''); });
    odswiez();
    powiedz('Przywrócono oryginalną treść strony.');
  });

  // ---------- Odswiezanie widoku ----------
  const pasekZapisu = $('[data-pasek-zapisu]')!;
  const licznikZmian = $('[data-licznik-zmian]')!;
  const grupy = $$('[data-grupa]');
  const wiersze = $$('[data-wiersz-modelu]');

  function opisWartosci(p: Pole, w: Wartosc): string {
    if (typeof w === 'boolean') return (w ? p.dataset.tak : p.dataset.nie) ?? (w ? 'tak' : 'nie');
    const zdjecia = opisWartosciZdjec(p.dataset.typ, w, String(oryginal(p)));
    if (zdjecia !== null) return zdjecia;
    if (!w) return '(puste)';
    return w.length > 90 ? `${w.slice(0, 88)}…` : w;
  }

  function odswiezListeZmian() {
    const lista = $('[data-lista-zmian]')!;
    const szablon = $<HTMLTemplateElement>('[data-szablon-zmiany]')!;
    const wpisy = Object.entries(zapisane).filter(([k]) => poKluczu.has(k));
    lista.replaceChildren(...wpisy.map(([k, z]) => {
      const p = poKluczu.get(k)!;
      const el = szablon.content.firstElementChild!.cloneNode(true) as HTMLElement;
      $('[data-co]', el)!.textContent = p.dataset.etykieta ?? k;
      $('[data-bylo]', el)!.textContent = opisWartosci(p, z.o);
      $('[data-jest]', el)!.textContent = opisWartosci(p, z.w);
      $('[data-edytuj]', el)!.addEventListener('click', () => idzDoPola(p));
      $('[data-cofnij]', el)!.addEventListener('click', () => {
        ustaw(p, oryginal(p));
        const reszta = { ...zapisane };
        delete reszta[k];
        if (zapisz(reszta)) {
          zapisane = reszta;
          sprzatnijZdjecia(zapisane);
        }
        odswiez();
        powiedz('Cofnięto zmianę.');
      });
      return el;
    }));
    $('[data-brak-zmian]')!.hidden = wpisy.length > 0;
    przyciskWszystko.hidden = wpisy.length === 0;

    const zapis = wczytaj();
    $('[data-ostatni-zapis]')!.textContent = zapis
      ? `Ostatni zapis: ${new Date(zapis.zapisano).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}.`
      : '';
  }

  function odswiezPulpit() {
    const zapisanyStan = (k: string) => { const p = poKluczu.get(k); return p ? stanZapisany(p) : true; };
    const widoczneGrupy = grupy.filter((g) => zapisanyStan(`kategoria:${g.dataset.grupa}:widoczna`) === true);
    const widoczneModele = widoczneGrupy.flatMap((g) => $$('[data-wiersz-modelu]', g))
      .filter((w) => zapisanyStan(`model:${w.dataset.wierszModelu}:widoczny`) === true);
    $('[data-stat="modele"]')!.textContent = String(widoczneModele.length);
    $('[data-stat="grupy"]')!.textContent = String(widoczneGrupy.length);
    $('[data-stat="zmiany"]')!.textContent = String(Object.keys(zapisane).length);
    $('[data-stat="ogloszenie"]')!.textContent = zapisanyStan('ogloszenie:wlaczone') === true ? 'włączone' : 'wyłączone';
  }

  function odswiez() {
    let niezapisane = 0;
    const zmianyWSekcji = new Map<string, number>();
    for (const p of pola) {
      const zmienione = wartosc(p) !== oryginal(p);
      p.closest('[data-pole-ramka]')?.classList.toggle('zmienione', zmienione);
      const b = przywracanie.get(klucz(p));
      if (b) b.hidden = !zmienione;
      if (wartosc(p) !== stanZapisany(p)) niezapisane++;
      if (zmienione) {
        const s = p.closest<HTMLElement>('[data-sekcja]')!.dataset.sekcja!;
        zmianyWSekcji.set(s, (zmianyWSekcji.get(s) ?? 0) + 1);
      }
    }

    pasekZapisu.hidden = niezapisane === 0;
    licznikZmian.textContent = odmiana(niezapisane, ['niezapisana zmiana', 'niezapisane zmiany', 'niezapisanych zmian']);
    $$('[data-znaczek]').forEach((z) => {
      const n = zmianyWSekcji.get(z.dataset.znaczek!) ?? 0;
      z.textContent = String(n);
      z.hidden = n === 0;
      z.title = `${odmiana(n, ['zmienione pole', 'zmienione pola', 'zmienionych pól'])}`;
    });

    // Oferta: stan wierszy i licznikow grup
    for (const w of wiersze) {
      const id = w.dataset.wierszModelu!;
      const polaWiersza = $$<Pole>('[data-pole]', w);
      w.classList.toggle('ukryty', poKluczu.get(`model:${id}:widoczny`)?.matches(':checked') === false);
      const zmieniony = polaWiersza.some((p) => wartosc(p) !== oryginal(p));
      w.classList.toggle('zmieniony', zmieniony);
      $('[data-przywroc-wiersz]', w)!.hidden = !zmieniony;
    }
    for (const g of grupy) {
      const id = g.dataset.grupa!;
      const wszystkie = $$('[data-wiersz-modelu]', g);
      const widoczne = wszystkie.filter((w) => !w.classList.contains('ukryty')).length;
      $(`[data-licznik-grupy="${id}"]`)!.textContent = `${widoczne} z ${wszystkie.length}`;
      g.classList.toggle('ukryta', poKluczu.get(`kategoria:${id}:widoczna`)?.matches(':checked') === false);
      const nazwa = poKluczu.get(`kategoria:${id}:nazwa`);
      if (nazwa) $(`[data-nazwa-grupy="${id}"]`)!.textContent = String(wartosc(nazwa)) || nazwa.defaultValue;
    }

    // Podglad ogloszenia
    const wlaczone = poKluczu.get('ogloszenie:wlaczone')?.matches(':checked') ?? false;
    const tekst = String(wartosc(poKluczu.get('ogloszenie:tekst')!));
    const link = String(wartosc(poKluczu.get('ogloszenie:link')!));
    $('[data-podglad-ogloszenia]')!.classList.toggle('wylaczone', !wlaczone);
    $('[data-podglad-tekst]')!.textContent = tekst || 'Wpisz treść ogłoszenia.';
    $('[data-podglad-link]')!.hidden = !link;

    odswiezListeZmian();
    odswiezPulpit();
    filtruj();
  }

  pola.forEach((p) => {
    p.addEventListener('input', () => {
      if (p.getAttribute('aria-invalid') === 'true') pokazBlad(p, blad(p));
      odswiez();
    });
    p.addEventListener('change', odswiez);
  });

  // ---------- Wyszukiwanie w ofercie ----------
  const szukaj = $<HTMLInputElement>('[data-szukaj-modelu]')!;
  const filtr = $<HTMLSelectElement>('[data-filtr-modeli]')!;
  const znormalizuj = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
  function filtruj() {
    const q = znormalizuj(szukaj.value);
    const f = filtr.value;
    let widocznych = 0;
    for (const g of grupy) {
      let wGrupie = 0;
      for (const w of $$('[data-wiersz-modelu]', g)) {
        const ukryty = w.classList.contains('ukryty');
        const pasuje = (!q || w.dataset.szukaj!.includes(q))
          && (f === 'wszystkie' || (f === 'widoczne' && !ukryty) || (f === 'ukryte' && ukryty) || (f === 'zmienione' && w.classList.contains('zmieniony')));
        w.hidden = !pasuje;
        if (pasuje) wGrupie++;
      }
      g.hidden = wGrupie === 0 && (Boolean(q) || f !== 'wszystkie');
      widocznych += wGrupie;
    }
    $('[data-brak-modeli]')!.hidden = widocznych > 0;
  }
  szukaj.addEventListener('input', filtruj);
  filtr.addEventListener('change', filtruj);

  // ---------- Start ----------
  zapisane = Object.fromEntries(Object.entries(wczytaj()?.pola ?? {}).filter(([k]) => poKluczu.has(k)));
  for (const [k, z] of Object.entries(zapisane)) ustaw(poKluczu.get(k)!, z.w);
  odswiez();
  if (sesja()) pokazPanel();
  else przyciskLogowania.focus();
}
