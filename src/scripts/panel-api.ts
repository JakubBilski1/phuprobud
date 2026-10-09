// Rozmowa panelu /admin/ z serwerem: sesja, zapis zmian, haslo, wgrywanie zdjec.
import { SZEROKOSC_MINI, type Pola } from '../lib/nadpisania';

export type StanPanelu =
  | { zalogowany: false; skonfigurowany: boolean }
  | { zalogowany: true; skonfigurowany: true; login: string; wymagaZmianyHasla: boolean; hasloZmieniono: string; pola: Pola; zapisano: string | null };

/** Blad z komunikatem do pokazania w panelu; status 401 oznacza wygasla sesje. */
export class BladPanelu extends Error {
  constructor(public status: number, komunikat: string) {
    super(komunikat);
  }
}

async function zadanie<T>(sciezka: string, opcje: RequestInit = {}): Promise<T> {
  let odpowiedz: Response;
  try {
    odpowiedz = await fetch(`/api/panel/${sciezka}/`, { credentials: 'same-origin', ...opcje });
  } catch {
    throw new BladPanelu(0, 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.');
  }
  const dane = await odpowiedz.json().catch(() => null);
  if (!odpowiedz.ok) throw new BladPanelu(odpowiedz.status, dane?.blad ?? 'Serwer zwrócił błąd. Spróbuj ponownie za chwilę.');
  return dane as T;
}

const wyslij = (metoda: string, tresc: unknown): RequestInit => ({ method: metoda, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tresc) });

export const pobierzStan = () => zadanie<StanPanelu>('stan');
export const zapiszStan = (pola: Pola) => zadanie<{ zapisano: string }>('stan', wyslij('PUT', { pola }));
/** Krok 1: e-mail i haslo. Serwer wysyla kod na e-mail i zwraca zamaskowany adres. */
export const zaloguj = (login: string, haslo: string) => zadanie<{ ok: true; email: string; minuty: number }>('logowanie', wyslij('POST', { login, haslo }));
/** Krok 2: kod z e-maila. 410 = trzeba zaczac od hasla. */
export const potwierdzKod = (kod: string) => zadanie<{ ok: true }>('kod', wyslij('POST', { kod }));
export const wyloguj = () => zadanie<{ ok: true }>('wyloguj', wyslij('POST', {}));
export const zmienHaslo = (obecne: string, nowe: string) => zadanie<{ ok: true }>('haslo', wyslij('POST', { obecne, nowe }));

async function jpeg(bitmapa: ImageBitmap, maks: number): Promise<{ blob: Blob; w: number; h: number }> {
  const skala = Math.min(1, maks / Math.max(bitmapa.width, bitmapa.height));
  const w = Math.round(bitmapa.width * skala);
  const h = Math.round(bitmapa.height * skala);
  const plotno = document.createElement('canvas');
  plotno.width = w;
  plotno.height = h;
  const ctx = plotno.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmapa, 0, 0, w, h);
  const blob = await new Promise<Blob>((ok, blad) => {
    plotno.toBlob((b) => (b ? ok(b) : blad(new Error('Nie udało się przygotować zdjęcia.'))), 'image/jpeg', 0.85);
  });
  return { blob, w, h };
}

/**
 * Zmniejsza obraz z dysku (pelny do 2000 px na dluzszym boku i miniatura), wysyla oba na serwer
 * i zwraca odnosnik „media:<id>”.
 */
export async function wgrajZdjecie(plik: File): Promise<string> {
  const bitmapa = await createImageBitmap(plik, { imageOrientation: 'from-image' });
  const pelne = await jpeg(bitmapa, 2000);
  const mini = await jpeg(bitmapa, SZEROKOSC_MINI);
  bitmapa.close();
  const formularz = new FormData();
  formularz.set('pelne', pelne.blob, 'pelne.jpg');
  formularz.set('mini', mini.blob, 'mini.jpg');
  formularz.set('w', String(pelne.w));
  formularz.set('h', String(pelne.h));
  formularz.set('nazwa', plik.name);
  return (await zadanie<{ odnosnik: string }>('zdjecia', { method: 'POST', body: formularz })).odnosnik;
}
