// Panel /admin/: logowanie na serwerze, edycja pol i zapis roznicy wzgledem oryginalu w bazie
// (src/pages/api/panel/). Oryginal to wartosc z HTML (defaultValue / defaultChecked): strona
// panelu jest budowana z tresci z repozytorium, wiec panel nie potrzebuje osobnej kopii danych.
// Zapisane zmiany sa od razu na stronie, dla wszystkich odwiedzajacych.
import type { Pola, Wartosc } from '../lib/nadpisania';
import { odmiana } from '../lib/tekst';
import { opisWartosciZdjec } from './panel-zdjecia';
import { pokazKonto, uruchomKontoPanelu } from './panel-konto';
import { BladPanelu, pobierzStan, potwierdzKod, wyloguj, zaloguj, zapiszStan, type StanPanelu } from './panel-api';

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
const klucz = (p: Pole) => p.dataset.pole!;

export async function uruchomPanel() {
  const logowanie = $('[data-logowanie]')!;
  const panel = $('[data-panel]')!;
  const pola = $$<Pole>('[data-pole]');
  const poKluczu = new Map(pola.map((p) => [klucz(p), p]));
  const przywracanie = new Map($$<HTMLButtonElement>('[data-przywroc]').map((b) => [b.dataset.przywroc!, b]));
  const sekcje = $$('[data-sekcja]');

  let zapisane: Pola = {};
  let ostatniZapis: string | null = null;
  const stanZapisany = (p: Pole): Wartosc => (klucz(p) in zapisane ? zapisane[klucz(p)].w : oryginal(p));

  // ---------- Logowanie ----------
  const formLogowania = $<HTMLFormElement>('[data-form-logowania]')!;
  const bladLogowania = $('[data-blad-logowania]')!;
  const przyciskLogowania = $<HTMLButtonElement>('[data-przycisk-logowania]')!;
  const formKodu = $<HTMLFormElement>('[data-form-kodu]')!;
  const opisKodu = $('[data-opis-kodu]')!;
  const bladKodu = $('[data-blad-kodu]')!;
  const infoKodu = $('[data-info-kodu]')!;
  const przyciskKodu = $<HTMLButtonElement>('[data-przycisk-kodu]')!;
  const przyciskNowegoKodu = $<HTMLButtonElement>('[data-nowy-kod]')!;
  // E-mail i haslo z kroku 1 zostaja tylko w pamieci karty, do „Wyslij nowy kod”.
  let dane1: { login: string; haslo: string } | null = null;

  const napisz = (el: HTMLElement, tekst: string) => { el.textContent = tekst; el.hidden = !tekst; };

  const pokazPanel = () => {
    logowanie.hidden = true;
    panel.hidden = false;
    zHasha();
  };
  const pokazLogowanie = (tekst = '') => {
    panel.hidden = true;
    logowanie.hidden = false;
    formKodu.hidden = true;
    formKodu.reset();
    dane1 = null;
    formLogowania.hidden = false;
    napisz(bladLogowania, tekst);
    formLogowania.reset();
    $<HTMLInputElement>('#l-login')?.focus();
  };
  const pokazKrokKodu = (email: string, minuty: number) => {
    formLogowania.hidden = true;
    formKodu.hidden = false;
    formKodu.reset();
    opisKodu.textContent = `Wysłaliśmy 6-cyfrowy kod na ${email}. Kod działa ${minuty} minut.`;
    napisz(bladKodu, '');
    napisz(infoKodu, '');
    $<HTMLInputElement>('#l-kod')?.focus();
  };
  /** Wczytuje do pol zmiany zapisane na serwerze i otwiera panel. */
  const otworz = (stan: Extract<StanPanelu, { zalogowany: true }>) => {
    zapisane = Object.fromEntries(Object.entries(stan.pola).filter(([k]) => poKluczu.has(k)));
    ostatniZapis = stan.zapisano;
    pola.forEach((p) => { ustaw(p, stanZapisany(p)); pokazBlad(p, ''); });
    pokazKonto(stan);
    odswiez();
    // Na hasle startowym panel nic nie zapisze: od razu zakladka zmiany hasla.
    if (stan.wymagaZmianyHasla) history.replaceState(null, '', '#konto');
    pokazPanel();
  };
  /** Serwer odrzucil zadanie: przy wygaslej sesji wracamy do logowania, inaczej pokazujemy powod. */
  const obsluzBlad = (b: unknown, domyslny: string) => {
    if (b instanceof BladPanelu && b.status === 401) return pokazLogowanie('Sesja wygasła. Zaloguj się ponownie; niezapisane zmiany trzeba wpisać jeszcze raz.');
    powiedz(b instanceof Error && b.message ? b.message : domyslny, { rodzaj: 'blad' });
  };

  formLogowania.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dane = new FormData(formLogowania);
    const proba = { login: String(dane.get('login') ?? '').trim(), haslo: String(dane.get('haslo') ?? '') };
    napisz(bladLogowania, '');
    przyciskLogowania.disabled = true;
    przyciskLogowania.textContent = 'Wysyłamy kod…';
    try {
      const wynik = await zaloguj(proba.login, proba.haslo);
      dane1 = proba;
      formLogowania.reset();
      pokazKrokKodu(wynik.email, wynik.minuty);
    } catch (b) {
      napisz(bladLogowania, b instanceof Error ? b.message : 'Nie udało się zalogować.');
    } finally {
      przyciskLogowania.disabled = false;
      przyciskLogowania.textContent = 'Zaloguj się';
    }
  });
  formKodu.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kod = String(new FormData(formKodu).get('kod') ?? '').replace(/\s/g, '');
    napisz(infoKodu, '');
    if (!/^\d{6}$/.test(kod)) return napisz(bladKodu, 'Wpisz 6 cyfr z e-maila.');
    napisz(bladKodu, '');
    przyciskKodu.disabled = true;
    przyciskKodu.textContent = 'Sprawdzamy…';
    try {
      await potwierdzKod(kod);
      const stan = await pobierzStan();
      if (!stan.zalogowany) throw new BladPanelu(0, 'Przeglądarka nie zapisała sesji. Sprawdź, czy nie blokuje ciasteczek tej strony.');
      dane1 = null;
      formKodu.reset();
      otworz(stan);
    } catch (b) {
      // Kod wygasl albo wyczerpal proby: wracamy do hasla, a serwer wysle nowy kod.
      if (b instanceof BladPanelu && b.status === 410) return pokazLogowanie(b.message);
      napisz(bladKodu, b instanceof Error ? b.message : 'Nie udało się sprawdzić kodu.');
      $<HTMLInputElement>('#l-kod')?.select();
    } finally {
      przyciskKodu.disabled = false;
      przyciskKodu.textContent = 'Potwierdź';
    }
  });
  przyciskNowegoKodu.addEventListener('click', async () => {
    if (!dane1) return pokazLogowanie();
    napisz(bladKodu, '');
    napisz(infoKodu, '');
    przyciskNowegoKodu.disabled = true;
    try {
      const wynik = await zaloguj(dane1.login, dane1.haslo);
      pokazKrokKodu(wynik.email, wynik.minuty);
      napisz(infoKodu, 'Wysłaliśmy nowy kod. Poprzedni już nie działa.');
    } catch (b) {
      napisz(bladKodu, b instanceof Error ? b.message : 'Nie udało się wysłać nowego kodu.');
    } finally {
      przyciskNowegoKodu.disabled = false;
    }
  });
  $('[data-wroc-do-hasla]')!.addEventListener('click', () => pokazLogowanie());
  $('[data-wyloguj]')!.addEventListener('click', async () => {
    odrzuc();
    await wyloguj().catch(() => { /* bez polaczenia sesja i tak wygasnie sama */ });
    pokazLogowanie();
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
  const przyciskZapisu = $<HTMLButtonElement>('[data-zapisz]')!;
  /** Wysyla komplet zmian na serwer; false, gdy sie nie udalo (komunikat juz pokazany). */
  async function wyslij(nowe: Pola): Promise<boolean> {
    przyciskZapisu.disabled = true;
    try {
      ostatniZapis = (await zapiszStan(nowe)).zapisano;
      zapisane = nowe;
      return true;
    } catch (b) {
      obsluzBlad(b, 'Nie udało się zapisać zmian.');
      return false;
    } finally {
      przyciskZapisu.disabled = false;
    }
  }

  async function zapiszZmiany() {
    if (przyciskZapisu.disabled) return;
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
    const nowe: Pola = {};
    for (const p of pola) {
      if (!czyPrzelacznik(p)) p.value = p.value.trim();
      const w = wartosc(p);
      const o = oryginal(p);
      if (w !== o) nowe[klucz(p)] = { w, o };
    }
    if (!(await wyslij(nowe))) return;
    odswiez();
    powiedz('Zapisano. Zmiany są już widoczne na stronie.', { link: ['/', 'Otwórz stronę'] });
  }

  function odrzuc() {
    pola.forEach((p) => {
      ustaw(p, stanZapisany(p));
      pokazBlad(p, '');
    });
    odswiez();
  }

  przyciskZapisu.addEventListener('click', () => void zapiszZmiany());
  $('[data-odrzuc]')!.addEventListener('click', () => {
    odrzuc();
    powiedz('Odrzucono niezapisane zmiany.');
  });
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !panel.hidden) {
      e.preventDefault();
      void zapiszZmiany();
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
  przyciskWszystko.addEventListener('click', async () => {
    if (!przyciskWszystko.dataset.potwierdz) {
      przyciskWszystko.dataset.potwierdz = '1';
      przyciskWszystko.textContent = 'Na pewno? Kliknij jeszcze raz';
      return;
    }
    delete przyciskWszystko.dataset.potwierdz;
    przyciskWszystko.textContent = 'Przywróć całą stronę do oryginału';
    if (!(await wyslij({}))) return;
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
      $('[data-cofnij]', el)!.addEventListener('click', async () => {
        const reszta = { ...zapisane };
        delete reszta[k];
        if (!(await wyslij(reszta))) return;
        ustaw(p, oryginal(p));
        odswiez();
        powiedz('Cofnięto zmianę. Na stronie jest znowu oryginał tego pola.');
      });
      return el;
    }));
    $('[data-brak-zmian]')!.hidden = wpisy.length > 0;
    przyciskWszystko.hidden = wpisy.length === 0;

    $('[data-ostatni-zapis]')!.textContent = ostatniZapis
      ? `Ostatni zapis: ${new Date(ostatniZapis).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}.`
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
  uruchomKontoPanelu(() => pokazLogowanie('Sesja wygasła. Zaloguj się ponownie.'));
  odswiez();
  try {
    const stan = await pobierzStan();
    if (stan.zalogowany) return otworz(stan);
    if (!stan.skonfigurowany) {
      pokazLogowanie('Panel nie ma jeszcze połączenia z bazą danych albo żadnego konta. Skontaktuj się z opiekunem strony.');
      przyciskLogowania.disabled = true;
      return;
    }
  } catch (b) {
    bladLogowania.textContent = b instanceof Error ? b.message : 'Serwer nie odpowiada.';
    bladLogowania.hidden = false;
  }
  logowanie.hidden = false;
  $<HTMLInputElement>('#l-login')?.focus();
}
