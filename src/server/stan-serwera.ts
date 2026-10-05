// Wczytuje z bazy zmiany z panelu i liste wgranych zdjec do pamieci serwera (src/data/stan.ts).
// Strony sa renderowane z pamieci, wiec odwiedzajacy nie czeka na baze.
import type { Pola } from '../lib/nadpisania';
import { ustawStan, type InfoMedia } from '../data/stan';
import { maBaze, sql } from './baza';

let zapisano: string | null = null;
export const ostatniZapis = () => zapisano;

export async function wczytajStan(): Promise<void> {
  const [stan] = await sql<{ pola: Pola; zapisano: Date }>('select pola, zapisano from panel_stan where id = 1');
  const zdjecia = await sql<{ id: string; w: number; h: number }>('select id, w, h from panel_zdjecia');
  const media: Record<string, InfoMedia> = Object.fromEntries(zdjecia.map((z) => [z.id, { w: z.w, h: z.h }]));
  zapisano = stan ? stan.zapisano.toISOString() : null;
  ustawStan(stan?.pola ?? {}, media);
}

const PONOWIENIE_MS = 15_000;
const CZEKANIE_NA_START_MS = 5_000;
let start: Promise<void> | null = null;

async function probuj(): Promise<void> {
  try {
    await wczytajStan();
  } catch (blad) {
    console.error('[panel] nie udalo sie wczytac zmian z bazy, ponowie za 15 s:', blad instanceof Error ? blad.message : blad);
    setTimeout(() => void probuj(), PONOWIENIE_MS).unref();
  }
}

/**
 * Pierwsze zadanie po starcie serwera czeka na zmiany z bazy (najwyzej 5 s), zeby nie pokazac
 * tresci sprzed zmian. Gdy baza nie odpowiada, strona startuje z trescia z repozytorium,
 * a wczytywanie jest ponawiane w tle.
 */
export function stanGotowy(): Promise<void> {
  if (!maBaze()) return Promise.resolve();
  if (!start) {
    start = Promise.race([probuj(), new Promise<void>((ok) => setTimeout(ok, CZEKANIE_NA_START_MS).unref())]);
  }
  return start;
}
