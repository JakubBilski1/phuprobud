// Zakladka „Konto i haslo” w panelu /admin/ i dane startowe w formularzu logowania.
// Pierwsza zmiana hasla wymaga kodu startowego, kolejne obecnego hasla (src/lib/konto-demo.ts).
import { blokadaKodu, DEMO, konto, MIN_DLUGOSC_HASLA, sprawdzHaslo, sprawdzKodStartowy, ustawHaslo } from '../lib/konto-demo';

const $ = <T extends Element = HTMLElement>(s: string, rodzic: ParentNode = document) => rodzic.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, rodzic: ParentNode = document) => [...rodzic.querySelectorAll<T>(s)];

/**
 * Formularz logowania i elementy trybu startowego. Dopoki haslo nie bylo zmieniane, login i haslo
 * startowe sa wpisane, a dopisek o nich widoczny; po pierwszej zmianie pola sa puste, dopisek
 * i zacheta na pulpicie znikaja (klasa konto-wlasne na <html>).
 */
export function przygotujLogowanie() {
  const k = konto();
  document.documentElement.classList.toggle('konto-wlasne', Boolean(k));
  const login = $<HTMLInputElement>('#l-login');
  const haslo = $<HTMLInputElement>('#l-haslo');
  if (login && haslo) {
    login.value = k ? '' : DEMO.login;
    haslo.value = k ? '' : DEMO.haslo;
  }
  const uzytkownik = $('[data-uzytkownik]');
  if (uzytkownik) uzytkownik.textContent = k?.login ?? DEMO.login;
}

export function uruchomKontoPanelu() {
  przygotujLogowanie();
  const form = $<HTMLFormElement>('[data-form-hasla]');
  if (!form) return;
  const blad = $('[data-blad-hasla]', form)!;
  const sukces = $('[data-ok-hasla]', form)!;
  const przycisk = $<HTMLButtonElement>('[data-przycisk-hasla]', form)!;
  const pierwsza = () => !konto();

  const odswiez = () => {
    const p = pierwsza();
    $$('[data-tylko-pierwsza]', form).forEach((el) => { el.hidden = !p; });
    $$('[data-tylko-kolejna]', form).forEach((el) => { el.hidden = p; });
    $('[data-tytul-hasla]', form)!.textContent = p ? 'Pierwsza zmiana hasła' : 'Zmiana hasła';
    const k = konto();
    $('[data-konto-stan]')!.textContent = k
      ? `Hasło zmienione ${new Date(k.zmieniono).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })}. Login i hasło startowe już nie działają.`
      : 'Panel działa jeszcze na loginie i haśle startowym. Ustaw własne hasło: pierwsza zmiana wymaga kodu startowego.';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    blad.hidden = true;
    sukces.hidden = true;
    const pokaz = (tekst: string) => { blad.textContent = tekst; blad.hidden = false; };
    const dane = new FormData(form);
    const kod = String(dane.get('kod') ?? '').trim();
    const obecne = String(dane.get('obecne') ?? '');
    const nowe = String(dane.get('nowe') ?? '');
    const powtorz = String(dane.get('powtorz') ?? '');
    const p = pierwsza();

    if (p) {
      const czekaj = blokadaKodu();
      if (czekaj) return pokaz(`Za dużo błędnych kodów. Spróbuj ponownie za ${czekaj} s.`);
      if (!/^\d{6}$/.test(kod)) return pokaz('Kod startowy ma 6 cyfr.');
    } else if (!obecne) {
      return pokaz('Wpisz obecne hasło.');
    }
    if (nowe.length < MIN_DLUGOSC_HASLA) return pokaz(`Nowe hasło musi mieć co najmniej ${MIN_DLUGOSC_HASLA} znaków.`);
    if (nowe === DEMO.haslo) return pokaz('Nowe hasło nie może być hasłem startowym.');
    if (nowe !== powtorz) return pokaz('Powtórzone hasło różni się od nowego.');

    przycisk.disabled = true;
    przycisk.textContent = 'Sprawdzam…';
    try {
      const potwierdzone = p ? await sprawdzKodStartowy(kod) : await sprawdzHaslo(obecne);
      if (!potwierdzone) {
        const czekaj = p ? blokadaKodu() : 0;
        return pokaz(p ? (czekaj ? `Nieprawidłowy kod startowy. Za dużo prób: spróbuj ponownie za ${czekaj} s.` : 'Nieprawidłowy kod startowy.') : 'Obecne hasło jest nieprawidłowe.');
      }
      if (!p && nowe === obecne) return pokaz('Nowe hasło jest takie samo jak obecne.');
      if (!(await ustawHaslo(nowe))) return pokaz('Nie udało się zapisać hasła: przeglądarka blokuje zapis danych strony (np. tryb prywatny).');
      form.reset();
      sukces.textContent = p
        ? 'Hasło ustawione. Od teraz logujesz się nowym hasłem; login i hasło startowe przestały działać, a formularz logowania nie podpowiada już danych.'
        : 'Hasło zmienione. Przy następnym logowaniu użyj nowego hasła.';
      sukces.hidden = false;
      odswiez();
      przygotujLogowanie();
    } finally {
      przycisk.disabled = false;
      przycisk.textContent = 'Zmień hasło';
    }
  });

  odswiez();
}
