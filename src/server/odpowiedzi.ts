// Wspolne odpowiedzi API panelu.
import type { APIContext } from 'astro';
import { maBaze } from './baza';
import { zalogowany } from './konto';

export const json = (dane: unknown, status = 200) =>
  new Response(JSON.stringify(dane), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export const blad = (status: number, komunikat: string, dodatkowe: Record<string, unknown> = {}) => json({ blad: komunikat, ...dodatkowe }, status);

/** Odpowiedz bledu, gdy nie ma bazy albo sesji; null, gdy zadanie moze isc dalej. */
export async function wymagajSesji({ cookies }: APIContext): Promise<Response | null> {
  if (!maBaze()) return blad(503, 'Panel nie jest podłączony do bazy danych.');
  if (!(await zalogowany(cookies))) return blad(401, 'Sesja wygasła. Zaloguj się ponownie.');
  return null;
}

/** Tresc zadania jako obiekt JSON albo null. */
export async function trescJson(zadanie: Request): Promise<Record<string, unknown> | null> {
  try {
    const dane = await zadanie.json();
    return dane && typeof dane === 'object' && !Array.isArray(dane) ? (dane as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
