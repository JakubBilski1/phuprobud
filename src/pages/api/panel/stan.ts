// Stan panelu: GET zwraca zapisane zmiany (albo informacje, ze trzeba sie zalogowac),
// PUT zapisuje nowy komplet zmian i od razu przelicza strone.
import type { APIRoute } from 'astro';
import { maBaze, sql } from '../../../server/baza';
import { saUzytkownicy, uzytkownikSesji } from '../../../server/konto';
import { blad, json, trescJson, wymagajSesji } from '../../../server/odpowiedzi';
import { ostatniZapis, wczytajStan } from '../../../server/stan-serwera';
import { sprawdzPola, uzywaneMedia } from '../../../server/walidacja';
import type { Pola } from '../../../lib/nadpisania';

export const prerender = false;

const HISTORIA = 50;

export const GET: APIRoute = async ({ cookies }) => {
  if (!maBaze()) return json({ zalogowany: false, skonfigurowany: false });
  try {
    const u = await uzytkownikSesji(cookies);
    if (!u) return json({ zalogowany: false, skonfigurowany: await saUzytkownicy() });
    const [stan] = await sql<{ pola: Pola }>('select pola from panel_stan where id = 1');
    return json({
      zalogowany: true,
      skonfigurowany: true,
      login: u.email,
      wymagaZmianyHasla: u.wymaga_zmiany,
      hasloZmieniono: u.zmieniono.toISOString(),
      pola: stan?.pola ?? {},
      zapisano: ostatniZapis(),
    });
  } catch (e) {
    console.error('[panel] odczyt stanu:', e instanceof Error ? e.message : e);
    return blad(503, 'Baza danych nie odpowiada. Spróbuj ponownie za chwilę.');
  }
};

export const PUT: APIRoute = async (kontekst) => {
  const odmowa = await wymagajSesji(kontekst);
  if (odmowa) return odmowa;
  const dane = await trescJson(kontekst.request);
  const wynik = sprawdzPola(dane?.pola);
  if ('blad' in wynik) return blad(400, wynik.blad);

  await sql(
    `insert into panel_stan (id, pola, zapisano) values (1, $1, now())
     on conflict (id) do update set pola = excluded.pola, zapisano = excluded.zapisano`,
    [JSON.stringify(wynik.pola)],
  );
  // Kopia kazdego zapisu: mozna odtworzyc tresc sprzed pomylki (ostatnie 50 zapisow).
  await sql('insert into panel_historia (pola) values ($1)', [JSON.stringify(wynik.pola)]);
  await sql('delete from panel_historia where id not in (select id from panel_historia order by id desc limit $1)', [HISTORIA]);
  // Wgrane zdjecia, do ktorych nic juz nie prowadzi, znikaja po dobie (wczesniej moga byc w niezapisanej edycji).
  await sql(`delete from panel_zdjecia where dodano < now() - interval '1 day' and not (id = any($1))`, [uzywaneMedia(wynik.pola)]);
  await wczytajStan();
  return json({ zapisano: ostatniZapis() });
};
