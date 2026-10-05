// Wgranie zdjecia z panelu. Przegladarka zmniejsza plik i wysyla dwa JPEG-i (pelny i miniature),
// serwer sprawdza rozmiar i naglowek pliku i zapisuje oba w bazie. Zdjecie jest potem pod /media/.
import { randomBytes } from 'node:crypto';
import type { APIRoute } from 'astro';
import { dodajMedia } from '../../../data/stan';
import { sql } from '../../../server/baza';
import { blad, json, wymagajSesji } from '../../../server/odpowiedzi';
import { adresMedia, PREFIKS_MEDIA } from '../../../lib/nadpisania';

export const prerender = false;

const MAKS_PELNE = 4 * 1024 * 1024;
const MAKS_MINI = 600 * 1024;
const MAKS_ZDJEC = 400;

async function jpeg(plik: FormDataEntryValue | null, maks: number): Promise<Buffer | null> {
  if (!(plik instanceof File) || plik.size === 0 || plik.size > maks) return null;
  const bajty = Buffer.from(await plik.arrayBuffer());
  // Naglowek JPEG: FF D8 FF. Inne pliki odrzucamy niezaleznie od deklarowanego typu.
  return bajty[0] === 0xff && bajty[1] === 0xd8 && bajty[2] === 0xff ? bajty : null;
}

export const POST: APIRoute = async (kontekst) => {
  const odmowa = await wymagajSesji(kontekst);
  if (odmowa) return odmowa;

  let formularz: FormData;
  try {
    formularz = await kontekst.request.formData();
  } catch {
    return blad(400, 'Nie udało się odczytać przesłanego pliku.');
  }
  const pelne = await jpeg(formularz.get('pelne'), MAKS_PELNE);
  const mini = await jpeg(formularz.get('mini'), MAKS_MINI);
  const w = Number(formularz.get('w'));
  const h = Number(formularz.get('h'));
  const wymiar = (n: number) => Number.isInteger(n) && n >= 16 && n <= 4000;
  if (!pelne || !mini || !wymiar(w) || !wymiar(h)) return blad(400, 'Plik nie jest poprawnym zdjęciem albo jest za duży.');

  const [{ ile }] = await sql<{ ile: string }>('select count(*) as ile from panel_zdjecia');
  if (Number(ile) >= MAKS_ZDJEC) return blad(400, 'W panelu jest już bardzo dużo wgranych zdjęć. Zapisz zmiany, żeby zwolnić miejsce po usuniętych.');

  const id = randomBytes(12).toString('hex');
  const nazwa = String(formularz.get('nazwa') ?? '').slice(0, 200);
  await sql('insert into panel_zdjecia (id, pelne, mini, w, h, nazwa) values ($1, $2, $3, $4, $5, $6)', [id, pelne, mini, w, h, nazwa]);
  dodajMedia(id, { w, h });
  return json({ odnosnik: PREFIKS_MEDIA + id, mini: adresMedia(id, 'mini') });
};
