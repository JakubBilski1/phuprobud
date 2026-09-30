// Formularz kontaktowy: walidacja po polsku, wybor dzialu zmienia adres i podpis przycisku,
// parametry z adresu (?temat=skup, ?model=...) wypelniaja pola.

type Dzial = { id: string; nazwa: string; email: string; telefon: string; przycisk: string };

export function uruchomFormularz(form: HTMLFormElement) {
  const dzialy: Dzial[] = JSON.parse(form.dataset.dzialy ?? '[]');
  const endpoint = form.dataset.endpoint ?? '';
  const przycisk = form.querySelector<HTMLButtonElement>('[data-przycisk-wyslij]');
  const adres = form.querySelector<HTMLElement>('[data-adres]');
  const wynik = form.parentElement?.querySelector<HTMLElement>('[data-wynik]');
  const pole = (n: string) => form.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | null;

  const wybrany = (): Dzial => {
    const id = (form.querySelector<HTMLInputElement>('input[name="dzial"]:checked')?.value) ?? dzialy[0].id;
    return dzialy.find((d) => d.id === id) ?? dzialy[0];
  };
  const odswiezDzial = () => {
    const d = wybrany();
    if (przycisk) przycisk.textContent = d.przycisk;
    if (adres) adres.textContent = d.email;
  };
  form.querySelectorAll('input[name="dzial"]').forEach((r) => r.addEventListener('change', odswiezDzial));

  // Wypelnienie z adresu strony: karta maszyny linkuje tu z ?model=..., sekcja uzywanych z ?temat=skup.
  const parametry = new URLSearchParams(location.search);
  const model = parametry.get('model');
  if (model && pole('maszyna')) pole('maszyna')!.value = model.slice(0, 120);
  if (parametry.get('temat') === 'skup' && pole('wiadomosc') && !pole('wiadomosc')!.value) {
    pole('wiadomosc')!.value = 'Chcę sprzedać maszynę. Marka, model, rok produkcji, motogodziny: ';
  }

  const bledy: Record<string, string> = {};
  const pokazBlad = (klucz: string, tekst: string, pola: string[]) => {
    bledy[klucz] = tekst;
    const el = form.querySelector<HTMLElement>(`[data-blad="${klucz}"]`);
    if (el) el.textContent = tekst;
    pola.forEach((p) => pole(p)?.setAttribute('aria-invalid', tekst ? 'true' : 'false'));
  };

  const sprawdz = () => {
    const imie = pole('imie')?.value.trim() ?? '';
    const tel = pole('telefon')?.value.trim() ?? '';
    const email = pole('email')?.value.trim() ?? '';
    const tresc = pole('wiadomosc')?.value.trim() ?? '';
    pokazBlad('imie', imie.length < 2 ? 'Wpisz imię i nazwisko.' : '', ['imie']);
    const telOk = tel.replace(/\D/g, '').length >= 9;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    let kontakt = '';
    if (!tel && !email) kontakt = 'Podaj telefon albo e-mail.';
    else if (tel && !telOk) kontakt = 'Numer telefonu ma za mało cyfr.';
    else if (email && !emailOk) kontakt = 'Adres e-mail wygląda na niepełny.';
    pokazBlad('kontakt', kontakt, ['telefon', 'email']);
    pokazBlad('wiadomosc', tresc.length < 5 ? 'Napisz, czego dotyczy wiadomość.' : '', ['wiadomosc']);
    return !Object.values(bledy).some(Boolean);
  };

  const trescWiadomosci = () => {
    const d = wybrany();
    const linie = [
      `Dział: ${d.nazwa}`,
      `Imię i nazwisko: ${pole('imie')?.value.trim()}`,
      pole('telefon')?.value.trim() ? `Telefon: ${pole('telefon')?.value.trim()}` : '',
      pole('email')?.value.trim() ? `E-mail: ${pole('email')?.value.trim()}` : '',
      pole('maszyna')?.value.trim() ? `Maszyna: ${pole('maszyna')?.value.trim()}` : '',
      '',
      pole('wiadomosc')?.value.trim() ?? '',
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '');
    const temat = `Zapytanie ze strony: ${pole('maszyna')?.value.trim() || d.nazwa}`;
    return { temat, tresc: linie.join('\n'), dzial: d };
  };

  const pokazWynik = (tytul: string, tekst: string) => {
    if (!wynik) return;
    wynik.querySelector<HTMLElement>('[data-wynik-tytul]')!.textContent = tytul;
    wynik.querySelector<HTMLElement>('[data-wynik-tekst]')!.textContent = tekst;
    wynik.hidden = false;
    wynik.focus();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!sprawdz()) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    const { temat, tresc, dzial } = trescWiadomosci();
    if (endpoint) {
      przycisk?.setAttribute('disabled', '');
      try {
        const odp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dzial: dzial.id, do: dzial.email, temat, tresc }),
        });
        if (!odp.ok) throw new Error(String(odp.status));
        form.reset();
        odswiezDzial();
        pokazWynik('Wiadomość wysłana', `Trafiła do: ${dzial.nazwa} (${dzial.email}).`);
      } catch {
        pokazWynik('Nie udało się wysłać', `Serwer nie przyjął wiadomości. Zadzwoń: ${dzial.telefon} albo napisz na ${dzial.email}.`);
      } finally {
        przycisk?.removeAttribute('disabled');
      }
      return;
    }
    window.location.href = `mailto:${dzial.email}?subject=${encodeURIComponent(temat)}&body=${encodeURIComponent(tresc)}`;
    pokazWynik(
      'Wiadomość czeka w programie pocztowym',
      `Sprawdź ją i wyślij na ${dzial.email}. Jeśli program pocztowy się nie otworzył, skopiuj treść poniżej albo zadzwoń: ${dzial.telefon}.`,
    );
  });

  wynik?.querySelector('[data-kopiuj]')?.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    const { temat, tresc, dzial } = trescWiadomosci();
    try {
      await navigator.clipboard.writeText(`Do: ${dzial.email}\nTemat: ${temat}\n\n${tresc}`);
      b.textContent = 'Skopiowano';
    } catch {
      b.textContent = 'Nie udało się skopiować';
    }
  });
  wynik?.querySelector('[data-nowa]')?.addEventListener('click', () => {
    form.reset();
    odswiezDzial();
    wynik.hidden = true;
    pole('imie')?.focus();
  });
}
