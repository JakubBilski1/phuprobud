// Zakladka „Konto i haslo” w panelu /admin/. Haslo sprawdza i zapisuje serwer (src/server/konto.ts).
import { MIN_DLUGOSC_HASLA } from '../lib/nadpisania';
import { BladPanelu, zmienHaslo, type StanPanelu } from './panel-api';

const $ = <T extends Element = HTMLElement>(s: string, rodzic: ParentNode = document) => rodzic.querySelector<T>(s);

type Konto = Extract<StanPanelu, { zalogowany: true }>;

/** Pokazuje dane konta po zalogowaniu. Dopoki dziala haslo startowe, panel zacheca do jego zmiany. */
export function pokazKonto(k: Pick<Konto, 'login' | 'wymagaZmianyHasla' | 'hasloZmieniono'>) {
  document.documentElement.classList.toggle('haslo-startowe', k.wymagaZmianyHasla);
  const uzytkownik = $('[data-uzytkownik]');
  if (uzytkownik) uzytkownik.textContent = k.login;
  const login = $<HTMLInputElement>('[data-login-konta]');
  if (login) login.value = k.login;
  const stan = $('[data-konto-stan]');
  if (stan) {
    stan.textContent = k.wymagaZmianyHasla
      ? 'Panel działa jeszcze na haśle startowym. Ustaw własne hasło; do tego czasu panel nie zapisuje zmian na stronie.'
      : `Hasło zmienione ${new Date(k.hasloZmieniono).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}.`;
  }
}

export function uruchomKontoPanelu(poWygasnieciuSesji: () => void) {
  const form = $<HTMLFormElement>('[data-form-hasla]');
  if (!form) return;
  const blad = $('[data-blad-hasla]', form)!;
  const sukces = $('[data-ok-hasla]', form)!;
  const przycisk = $<HTMLButtonElement>('[data-przycisk-hasla]', form)!;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    blad.hidden = true;
    sukces.hidden = true;
    const pokaz = (tekst: string) => { blad.textContent = tekst; blad.hidden = false; };
    const dane = new FormData(form);
    const obecne = String(dane.get('obecne') ?? '');
    const nowe = String(dane.get('nowe') ?? '');
    const powtorz = String(dane.get('powtorz') ?? '');

    if (!obecne) return pokaz('Wpisz obecne hasło.');
    if (nowe.length < MIN_DLUGOSC_HASLA) return pokaz(`Nowe hasło musi mieć co najmniej ${MIN_DLUGOSC_HASLA} znaków.`);
    if (nowe !== powtorz) return pokaz('Powtórzone hasło różni się od nowego.');
    if (nowe === obecne) return pokaz('Nowe hasło jest takie samo jak obecne.');

    przycisk.disabled = true;
    przycisk.textContent = 'Zapisuję…';
    try {
      await zmienHaslo(obecne, nowe);
      const login = $<HTMLInputElement>('[data-login-konta]')?.value ?? '';
      form.reset();
      pokazKonto({ login, wymagaZmianyHasla: false, hasloZmieniono: new Date().toISOString() });
      sukces.textContent = 'Hasło zmienione. Na innych urządzeniach trzeba zalogować się ponownie, nowym hasłem.';
      sukces.hidden = false;
    } catch (b) {
      if (b instanceof BladPanelu && b.status === 401) return poWygasnieciuSesji();
      pokaz(b instanceof Error ? b.message : 'Nie udało się zmienić hasła.');
    } finally {
      przycisk.disabled = false;
      przycisk.textContent = 'Zmień hasło';
    }
  });
}
