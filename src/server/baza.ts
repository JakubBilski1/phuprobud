// Polaczenie z Postgresem (zmienna DATABASE_URL) i tabele panelu /admin/.
// Bez DATABASE_URL strona dziala na tresci z repozytorium, a panel informuje, ze nie ma bazy.
import pg from 'pg';

let pula: pg.Pool | null = null;
let schemat: Promise<void> | null = null;

export const maBaze = () => Boolean(process.env.DATABASE_URL);

function polaczenie(): pg.Pool {
  if (!pula) {
    // Mala pula: serwer bazy jest wspolny dla wielu aplikacji.
    pula = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 4_000 });
    pula.on('error', (blad) => console.error('[baza] blad polaczenia w puli:', blad.message));
  }
  return pula;
}

const SCHEMAT = `
  create table if not exists panel_stan (
    id int primary key check (id = 1),
    pola jsonb not null,
    zapisano timestamptz not null default now()
  );
  create table if not exists panel_historia (
    id bigserial primary key,
    pola jsonb not null,
    zapisano timestamptz not null default now()
  );
  create table if not exists panel_konto (
    id int primary key check (id = 1),
    login text not null,
    skrot text not null,
    sol text not null,
    wymaga_zmiany boolean not null default true,
    zmieniono timestamptz not null default now()
  );
  create table if not exists panel_sesje (
    skrot_tokenu text primary key,
    wygasa timestamptz not null
  );
  create table if not exists panel_zdjecia (
    id text primary key,
    pelne bytea not null,
    mini bytea not null,
    w int not null,
    h int not null,
    nazwa text not null default '',
    dodano timestamptz not null default now()
  );
`;

/** Zapytanie do bazy; przy pierwszym uzyciu zaklada tabele. */
export async function sql<W extends pg.QueryResultRow = pg.QueryResultRow>(tekst: string, parametry: unknown[] = []): Promise<W[]> {
  if (!schemat) {
    schemat = polaczenie().query(SCHEMAT).then(() => undefined);
    // Nieudane zalozenie tabel (baza chwilowo niedostepna) ponawiamy przy nastepnym zapytaniu.
    schemat.catch(() => { schemat = null; });
  }
  await schemat;
  return (await polaczenie().query<W>(tekst, parametry)).rows;
}
