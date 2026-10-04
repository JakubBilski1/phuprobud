// Zdjecia wgrane w panelu demonstracyjnym /admin/. Pliki sa za duze na localStorage, wiec leza
// w IndexedDB tej przegladarki; w nadpisaniach (localStorage) zostaje tylko odnosnik „idb:<id>”.
// Nikt poza ta przegladarka ich nie widzi, tak jak reszty zmian z panelu.

const BAZA = 'probud-demo-zdjecia';
const MAGAZYN = 'zdjecia';
export const PREFIKS_IDB = 'idb:';
export const PREFIKS_PLIKU = 'plik:';

export type ZdjecieDemo = { blob: Blob; w: number; h: number; nazwa: string };
/** Pozycja galerii: z = klucz zdjecia w manifescie (np. realizacje/02) albo „idb:<id>”, p = podpis. */
export type PozycjaGalerii = { z: string; p: string };

function otworz(): Promise<IDBDatabase> {
  return new Promise((ok, blad) => {
    const zadanie = indexedDB.open(BAZA, 1);
    zadanie.onupgradeneeded = () => zadanie.result.createObjectStore(MAGAZYN);
    zadanie.onsuccess = () => ok(zadanie.result);
    zadanie.onerror = () => blad(zadanie.error);
  });
}

async function transakcja<T>(tryb: IDBTransactionMode, praca: (m: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const baza = await otworz();
  try {
    return await new Promise<T>((ok, blad) => {
      const t = baza.transaction(MAGAZYN, tryb);
      const zadanie = praca(t.objectStore(MAGAZYN));
      t.oncomplete = () => ok(zadanie.result);
      t.onerror = () => blad(t.error);
      t.onabort = () => blad(t.error);
    });
  } finally {
    baza.close();
  }
}

/** Zapisuje zdjecie i zwraca odnosnik „idb:<id>”. */
export async function zapiszZdjecie(z: ZdjecieDemo): Promise<string> {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  await transakcja('readwrite', (m) => m.put(z, id));
  return PREFIKS_IDB + id;
}

const adresy = new Map<string, Promise<string | null>>();
/** Adres (blob:) zdjecia z IndexedDB; null, gdy zdjecia juz nie ma albo baza jest niedostepna. */
export function adresZdjecia(odnosnik: string): Promise<string | null> {
  if (!adresy.has(odnosnik)) {
    adresy.set(odnosnik, transakcja<ZdjecieDemo | undefined>('readonly', (m) => m.get(odnosnik.slice(PREFIKS_IDB.length)))
      .then((z) => (z ? URL.createObjectURL(z.blob) : null))
      .catch(() => null));
  }
  return adresy.get(odnosnik)!;
}

/** Odnosniki „idb:” wystepujace w zapisanych wartosciach (pole galerii to JSON z odnosnikami). */
export function odnosnikiIdb(wartosci: unknown[]): Set<string> {
  const wynik = new Set<string>();
  for (const w of wartosci) {
    if (typeof w !== 'string') continue;
    for (const m of w.matchAll(/idb:[a-z0-9]+/g)) wynik.add(m[0]);
  }
  return wynik;
}

/** Usuwa z IndexedDB zdjecia, do ktorych nie prowadzi juz zaden zapisany odnosnik. */
export async function posprzataj(uzywane: Set<string>): Promise<void> {
  try {
    const klucze = await transakcja<IDBValidKey[]>('readonly', (m) => m.getAllKeys());
    const zbedne = klucze.filter((k) => !uzywane.has(PREFIKS_IDB + String(k)));
    for (const k of zbedne) await transakcja('readwrite', (m) => m.delete(k));
  } catch {
    // baza niedostepna (tryb prywatny): nie ma czego sprzatac
  }
}

/** Zmniejsza obraz z dysku do najwyzej `maks` px na dluzszym boku i zapisuje jako JPEG. */
export async function przygotujZdjecie(plik: File, maks = 2000): Promise<ZdjecieDemo> {
  const bitmapa = await createImageBitmap(plik, { imageOrientation: 'from-image' });
  const skala = Math.min(1, maks / Math.max(bitmapa.width, bitmapa.height));
  const w = Math.round(bitmapa.width * skala);
  const h = Math.round(bitmapa.height * skala);
  const plotno = document.createElement('canvas');
  plotno.width = w;
  plotno.height = h;
  const ctx = plotno.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmapa, 0, 0, w, h);
  bitmapa.close();
  const blob = await new Promise<Blob>((ok, blad) => {
    plotno.toBlob((b) => (b ? ok(b) : blad(new Error('Nie udało się przygotować zdjęcia.'))), 'image/jpeg', 0.85);
  });
  return { blob, w, h, nazwa: plik.name };
}
