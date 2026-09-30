// Galeria „jeden kadr”: strzalki, miniatury, klawiatura, przeciaganie palcem, pelny ekran.
// Pelne zdjecie dostaje srcset dopiero, gdy jest biezace albo sasiednie.

export function uruchomGalerie(korzen: HTMLElement) {
  const zdjecia = [...korzen.querySelectorAll<HTMLImageElement>('[data-galeria-zdjecie]')];
  const miniatury = [...korzen.querySelectorAll<HTMLButtonElement>('[data-galeria-idz]')];
  const scena = korzen.querySelector<HTMLElement>('[data-galeria-scena]');
  const nr = korzen.querySelector<HTMLElement>('[data-galeria-nr]');
  const podpis = korzen.querySelector<HTMLElement>('[data-galeria-podpis]');
  const pelny = korzen.querySelector<HTMLButtonElement>('[data-galeria-pelny]');
  const pelnyPodpis = korzen.querySelector<HTMLElement>('[data-galeria-pelny-podpis]');
  if (!zdjecia.length || !scena) return;

  let biezace = 0;

  const zaladuj = (i: number) => {
    const img = zdjecia[(i + zdjecia.length) % zdjecia.length];
    if (img.srcset || !img.dataset.srcset) return;
    img.srcset = img.dataset.srcset;
    img.src = img.dataset.src ?? '';
  };

  const pokaz = (i: number, zPrzewinieciem = true) => {
    const nastepne = (i + zdjecia.length) % zdjecia.length;
    if (nastepne === biezace) return;
    zaladuj(nastepne);
    zdjecia[biezace].classList.remove('aktywne');
    zdjecia[nastepne].classList.add('aktywne');
    miniatury[biezace]?.removeAttribute('aria-current');
    miniatury[nastepne]?.setAttribute('aria-current', 'true');
    if (zPrzewinieciem) miniatury[nastepne]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    biezace = nastepne;
    if (nr) nr.textContent = String(biezace + 1);
    if (podpis) podpis.textContent = zdjecia[biezace].alt;
    zaladuj(biezace + 1);
    zaladuj(biezace - 1);
  };

  korzen.querySelectorAll<HTMLButtonElement>('[data-galeria-krok]').forEach((b) =>
    b.addEventListener('click', () => pokaz(biezace + Number(b.dataset.galeriaKrok))),
  );
  miniatury.forEach((b) => b.addEventListener('click', () => pokaz(Number(b.dataset.galeriaIdz), false)));

  korzen.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { pokaz(biezace + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { pokaz(biezace - 1); e.preventDefault(); }
  });

  // Przeciaganie: przesuniecie w poziomie o ponad 40 px zmienia zdjecie.
  let startX: number | null = null;
  scena.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  scena.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) pokaz(biezace + (dx < 0 ? 1 : -1));
  });
  scena.addEventListener('pointercancel', () => { startX = null; });

  // Sasiednie zdjecia pobieramy dopiero, gdy galeria zbliza sie do ekranu.
  new IntersectionObserver((wpisy, obs) => {
    if (wpisy.some((w) => w.isIntersecting)) { zaladuj(1); zaladuj(-1); obs.disconnect(); }
  }, { rootMargin: '400px' }).observe(korzen);

  if (pelny && document.fullscreenEnabled) {
    pelny.hidden = false;
    pelny.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else scena.requestFullscreen().catch(() => {});
    });
    document.addEventListener('fullscreenchange', () => {
      const wlaczony = document.fullscreenElement === scena;
      if (pelnyPodpis) pelnyPodpis.textContent = wlaczony ? 'Zamknij pełny ekran' : 'Pełny ekran';
      if (wlaczony) scena.focus();
    });
    // Strzalki w trybie pelnoekranowym obsluguje nasluch na korzeniu (scena jest w srodku).
    scena.tabIndex = -1;
  }
}
