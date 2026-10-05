// Posrednik serwera: czeka na zmiany z bazy przy pierwszym zadaniu, pilnuje pochodzenia zadan
// zapisujacych (API panelu) i trzyma w pamieci gotowy HTML stron do nastepnego zapisu w panelu.
import { defineMiddleware } from 'astro:middleware';
import { wersjaStanu } from './data/stan';
import { stanGotowy } from './server/stan-serwera';

type Gotowa = { wersja: number; tresc: string; typ: string };
const gotowe = new Map<string, Gotowa>();
const MAKS_STRON = 300;

export const onRequest = defineMiddleware(async (kontekst, dalej) => {
  if (kontekst.isPrerendered) return dalej();
  await stanGotowy();

  const { request: zadanie, url } = kontekst;
  const metoda = zadanie.method;

  if (url.pathname.startsWith('/api/')) {
    // Zadania zmieniajace dane przyjmujemy tylko z tej samej strony (ciasteczko sesji ma tez SameSite=Strict).
    if (metoda !== 'GET' && metoda !== 'HEAD') {
      const pochodzenie = zadanie.headers.get('origin');
      const host = zadanie.headers.get('host');
      let zgodne = false;
      try { zgodne = Boolean(pochodzenie) && new URL(pochodzenie!).host === host; } catch { /* zly naglowek Origin */ }
      if (!zgodne) return new Response(JSON.stringify({ blad: 'Żądanie z innej strony zostało odrzucone.' }), { status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }
    return dalej();
  }
  if (metoda !== 'GET' || url.pathname.startsWith('/media/')) return dalej();

  // Strony zaleza tylko od sciezki i od zmian z panelu, wiec gotowy HTML sluzy do nastepnego zapisu.
  const wersja = wersjaStanu();
  const zapamietana = gotowe.get(url.pathname);
  if (zapamietana?.wersja === wersja) {
    return new Response(zapamietana.tresc, { headers: { 'Content-Type': zapamietana.typ, 'Cache-Control': 'no-cache' } });
  }
  const odpowiedz = await dalej();
  const typ = odpowiedz.headers.get('content-type') ?? '';
  if (odpowiedz.status !== 200 || !/^(text\/html|application\/xml)/.test(typ)) return odpowiedz;
  const tresc = await odpowiedz.text();
  if (gotowe.size >= MAKS_STRON) gotowe.clear();
  gotowe.set(url.pathname, { wersja, tresc, typ });
  return new Response(tresc, { headers: { 'Content-Type': typ, 'Cache-Control': 'no-cache' } });
});
