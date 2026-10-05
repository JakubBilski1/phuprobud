# Wdrożenie (Coolify)

Panel: `coolify.pbdevs.com`. DNS `*.pbdevs.com` wskazuje na VPS (wildcard), więc nowa
subdomena nie wymaga rekordu.

## Aplikacja

Zasób `phuprobud` w projekcie `apps`, środowisko `production`
(UUID `mhu3nobisecwola9jl5v6ivi`):

| Ustawienie | Wartość |
| --- | --- |
| Źródło | GitHub App `bilski-github-apps`, repo `JakubBilski1/phuprobud`, gałąź `main` |
| Build pack | Dockerfile (`/Dockerfile`, katalog `/`) |
| Port | `80` (nginx w obrazie) |
| Domena | `https://phuprobud.pbdevs.com`, indeksowanie: NoIndex |

Push do `main` wdraża automatycznie (GitHub App). Build jest lekki: `npm ci` + `astro build`,
bez przetwarzania obrazów (ok. 30 s lokalnie). Serwer dzieli pamięć z innymi aplikacjami,
więc jeden push naraz.

## Baza danych

Współdzielony Postgres `pbdevs-postgres` (projekt `infrastructure`), jak w pozostałych
aplikacjach. Osobna rola i baza `probud`:

```sql
create role probud login password '<HASLO>';
create database probud owner probud;
```

Uruchom w **Terminal** zasobu `pbdevs-postgres` (`psql -U postgres`). Hasło generuj poza
repozytorium (`openssl rand -hex 20`) i nigdy go nie zapisuj w repo. Wersja w jednym
poleceniu, z hasłem generowanym w kontenerze:

```sh
PW=$(head -c 20 /dev/urandom | od -An -tx1 | tr -d ' \n'); psql -U postgres -v ON_ERROR_STOP=1 -c "create role probud login password '$PW';" -c "create database probud owner probud;" && echo "DATABASE_URL=postgres://probud:$PW@h11pl78c7l9lcb077an5e9sa:5432/probud"
```

Adres z sieci Dockera Coolify:
`postgres://probud:<HASLO>@h11pl78c7l9lcb077an5e9sa:5432/probud`. Hostem jest UUID kontenera
bazy, nie nazwa `pbdevs-postgres` (ta nie rozwiązuje się w sieci `coolify`, patrz
`Datequest/docs/WDROZENIE.md`).

Zmienna w aplikacji (zakładka Environment Variables): `DATABASE_URL` = adres wyżej.

Strona jest dziś statyczna (nginx) i z bazy nie korzysta. Zmienna jest przygotowana pod
backend formularza (zapis zapytań), zgodnie z konwencją pozostałych aplikacji.

## Przepięcie domeny phuprobud.pl (SEO)

Stan wyjściowy (05.10.2026): stara strona to WordPress pod `https://phuprobud.pl` (bez www),
44 adresy w `wp-sitemap.xml`. Każdy z nich ma przekierowanie 301 w `przekierowania.conf`
(generowane przy buildzie z `src/pages/przekierowania.conf.ts`).

Co działa samo, bez zmian w kodzie:

- `X-Robots-Tag: noindex` dostaje każdy host poza `phuprobud.pl` (`map` w `nginx.conf`).
  Demo nigdy nie trafi do Google, a domena docelowa nigdy nie dostanie noindex.
- `www.phuprobud.pl` przekierowuje 301 na `phuprobud.pl`.
- `/robots.txt` i `/sitemap.xml` są generowane przy buildzie.

Kolejność w dniu przepięcia:

1. W `astro.config.mjs` zmień `site` na `https://phuprobud.pl`. Od tego zależą adresy
   kanoniczne, mapa strony, `robots.txt`, obrazy Open Graph i dane strukturalne. Bez tej zmiany
   strona na nowej domenie wskazywałaby jako kanoniczny adres demo, który ma noindex.
2. `npm run check && npm run build`, push.
3. W Coolify dodaj domeny `https://phuprobud.pl,https://www.phuprobud.pl` (obie, żeby
   certyfikat objął też www).
4. U rejestratora domeny przestaw rekordy `A` dla `phuprobud.pl` i `www` na adres VPS.
   Rekordów `MX` nie ruszaj: skrzynki `@phuprobud.pl` mają działać dalej.
5. Sprawdź po przepięciu:
   - `curl -sI https://phuprobud.pl/` nie zawiera `X-Robots-Tag`,
   - `curl -sI https://phuprobud.pl/bomag-bw-65/` zwraca `301` na kartę w `/oferta/`,
   - `curl -sI https://www.phuprobud.pl/` zwraca `301` na adres bez www,
   - `https://phuprobud.pl/sitemap.xml` ma adresy z `phuprobud.pl`.
6. Google Search Console (usługa domeny `phuprobud.pl`): zgłoś `https://phuprobud.pl/sitemap.xml`,
   a dla strony głównej użyj „Poproś o zaindeksowanie”. Jeśli nikt nie ma dostępu do Search
   Console, załóż usługę i potwierdź ją rekordem `TXT` w DNS.
7. Wizytówka Google (Profil Firmy): adres strony się nie zmienia, więc wizytówki nie trzeba
   edytować. Wystarczy sprawdzić, czy link prowadzi na `https://phuprobud.pl/`.

Przez 2 do 4 tygodni po przepięciu zaglądaj w Search Console do raportu „Strony”: adresy
z błędem 404 dopisz do `RECZNE` w `src/pages/przekierowania.conf.ts`.
