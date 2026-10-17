// Zdarzenia do Umami (umami.pbdevs.com): telefony, e-maile, formularz, otomoto, dojazd, dokumenty, 404.
// Odslony, zrodla wejsc, UTM, kraj i urzadzenie Umami liczy sam. Klikniecia lapiemy jednym
// sluchaczem na dokumencie, zeby komponenty nie musialy nic wiedziec o statystykach.
// Bez skryptu Umami (adres inny niz phuprobud.pl, bloker reklam) wszystko tu po cichu nic nie robi.

export type Dane = Record<string, string | number>;
type Umami = { track: (nazwa: string, dane?: Dane) => void };

export function sledz(nazwa: string, dane?: Dane) {
  try {
    (window as unknown as { umami?: Umami }).umami?.track(nazwa, dane);
  } catch { /* statystyki nie moga zepsuc strony */ }
}

// Sekcja strony, z ktorej przyszlo klikniecie: rozroznia np. telefon z naglowka od telefonu z kontaktu.
const OGOLNE_KLASY = new Set(['kontener', 'sekcja', 'sekcja--grafit']);
function miejsce(el: Element): string {
  if (el.closest('header')) return 'naglowek';
  if (el.closest('footer')) return 'stopka';
  const blok = el.closest('section, nav, aside, [id]:not(main), body > div, main > div');
  if (!blok) return 'strona';
  return blok.id || [...blok.classList].find((k) => !OGOLNE_KLASY.has(k)) || 'strona';
}

function zdarzenieLinku(a: HTMLAnchorElement): [string, Dane] | null {
  const gdzie = miejsce(a);
  const href = a.getAttribute('href') ?? '';
  if (href.startsWith('tel:')) return ['telefon', { numer: href.slice(4), miejsce: gdzie }];
  if (href.startsWith('mailto:')) return ['e-mail', { adres: href.slice(7).split('?')[0], miejsce: gdzie }];

  let url: URL;
  try { url = new URL(a.href, location.href); } catch { return null; }
  if (/\.pdf$/i.test(url.pathname) || url.pathname.startsWith('/dokumenty/')) {
    return ['dokument', { plik: decodeURIComponent(url.pathname.split('/').pop() ?? ''), miejsce: gdzie }];
  }
  if (url.origin !== location.origin) {
    const host = url.hostname.replace(/^www\./, '');
    if (host.endsWith('otomoto.pl')) return ['otomoto', { miejsce: gdzie }];
    if (host === 'google.com' && url.pathname.startsWith('/maps')) return ['trasa-dojazdu', { miejsce: gdzie }];
    if (host.endsWith('facebook.com') || host.endsWith('instagram.com')) return ['social', { serwis: host.split('.')[0], miejsce: gdzie }];
    return ['link-zewnetrzny', { cel: host, miejsce: gdzie }];
  }
  // Przejscie do formularza z karty maszyny (?model=...) albo z sekcji uzywanych (?temat=skup).
  if (url.hash === '#formularz') {
    const dane: Dane = { miejsce: gdzie };
    const model = url.searchParams.get('model');
    const temat = url.searchParams.get('temat');
    if (model) dane.model = model.slice(0, 120);
    if (temat) dane.temat = temat;
    return ['do-formularza', dane];
  }
  return null;
}

export function uruchomStatystyki() {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href]');
    if (!(a instanceof HTMLAnchorElement)) return;
    const zdarzenie = zdarzenieLinku(a);
    if (zdarzenie) sledz(...zdarzenie);
  }, { capture: true });

  // Strona 404 (nginx podaje ja pod blednym adresem): skad ludzie trafiaja na nieistniejace adresy.
  if (document.querySelector('[data-strona-404]')) {
    const skad = () => {
      try { const r = new URL(document.referrer); return r.host + r.pathname; } catch { return 'bezposrednio'; }
    };
    const wyslij = () => sledz('404', { adres: location.pathname + location.search, skad: skad() });
    if (document.readyState === 'complete') wyslij();
    else addEventListener('load', wyslij, { once: true });
  }
}
