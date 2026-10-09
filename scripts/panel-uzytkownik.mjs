// Dodaje uzytkownika panelu /admin/ albo ustawia mu nowe haslo startowe.
// Wypisuje zapytanie SQL do wklejenia w terminalu bazy (Coolify: zasob pbdevs-postgres,
// `psql -U postgres -d probud`). Skrot liczy sie tutaj, wiec haslo nie trafia ani na serwer,
// ani do bazy. Parametry scrypt musza byc takie same jak w src/server/konto.ts.
//
// Uzycie:  node scripts/panel-uzytkownik.mjs info@phuprobud.pl [haslo]
// Bez hasla skrypt losuje haslo startowe i wypisuje je na stderr. Panel prosi o zmiane hasla
// po pierwszym logowaniu; kazde logowanie i tak wymaga kodu wyslanego na ten e-mail.
import { randomBytes, scryptSync } from 'node:crypto';

const [surowy, podane] = process.argv.slice(2);
const email = String(surowy ?? '').trim().toLowerCase();
if (!/^[^\s@']+@[^\s@']+\.[^\s@']+$/.test(email)) {
  console.error('Podaj poprawny e-mail: node scripts/panel-uzytkownik.mjs info@phuprobud.pl [haslo]');
  process.exit(1);
}
const haslo = podane ?? randomBytes(12).toString('base64url');
const sol = randomBytes(16).toString('base64');
const skrot = scryptSync(haslo.normalize('NFKC'), Buffer.from(sol, 'base64'), 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('base64');

console.log(`insert into panel_uzytkownicy (email, skrot, sol, wymaga_zmiany) values ('${email}', '${skrot}', '${sol}', true)
  on conflict (email) do update set skrot = excluded.skrot, sol = excluded.sol, wymaga_zmiany = true, zmieniono = now();
delete from panel_sesje where uzytkownik_id = (select id from panel_uzytkownicy where email = '${email}');`);
if (!podane) console.error(`Hasło startowe dla ${email}: ${haslo}`);
