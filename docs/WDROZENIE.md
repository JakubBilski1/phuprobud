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
| Port | `80` (nginx w obrazie, za nim serwer Node na `127.0.0.1:4321`) |
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

## Panel `/admin/`

Panel zapisuje zmiany w bazie `probud`. Tabele (`panel_stan`, `panel_historia`, `panel_konto`,
`panel_sesje`, `panel_zdjecia`) serwer zakłada sam przy pierwszym połączeniu.

Zmienne w aplikacji (zakładka Environment Variables), obie tylko w czasie działania, nie przy buildzie:

| Zmienna | Wartość |
| --- | --- |
| `DATABASE_URL` | adres bazy z sekcji wyżej |
| `PANEL_HASLO_STARTOWE` | hasło do pierwszego logowania (login `admin`), generowane poza repozytorium |
| `PANEL_LOGIN` | opcjonalnie inny login niż `admin` |

Konto zakłada się przy pierwszym wejściu na `/admin/`, z hasłem z `PANEL_HASLO_STARTOWE`. Panel
prosi o zmianę hasła; po zmianie zmienna nie ma znaczenia i można ją usunąć. Bez `DATABASE_URL`
strona działa na treści z repozytorium, a panel pokazuje, że nie jest podłączony do bazy.

Stan panelu bez logowania: `curl -s https://<domena>/api/panel/stan/`. Odpowiedź
`"skonfigurowany":false` oznacza brak bazy albo brak hasła startowego.

Zapomniane hasło: w terminalu bazy `delete from panel_konto; delete from panel_sesje;`, ustaw nowe
`PANEL_HASLO_STARTOWE` i uruchom aplikację ponownie.

Cofnięcie pomyłki w treści: tabela `panel_historia` trzyma 50 ostatnich zapisów. Przywrócenie
wybranego: `update panel_stan set pola = (select pola from panel_historia where id = <ID>);`
i restart aplikacji (serwer czyta zmiany przy starcie i po każdym zapisie z panelu).

## Przepięcie domeny phuprobud.pl (SEO)

Stan wyjściowy (05.10.2026): stara strona to WordPress pod `https://phuprobud.pl` (bez www),
44 adresy w `wp-sitemap.xml`. Każdy z nich ma przekierowanie 301 w `przekierowania.conf`
(generowane przy buildzie z `src/pages/przekierowania.conf.ts`).

Co działa samo, bez zmian w kodzie:

- `X-Robots-Tag: noindex` dostaje każdy host poza `phuprobud.pl` (`map` w `nginx.conf`).
  Demo nigdy nie trafi do Google, a domena docelowa nigdy nie dostanie noindex.
- `www.phuprobud.pl` przekierowuje 301 na `phuprobud.pl`.
- `/robots.txt` i `/sitemap.xml` są generowane przy buildzie.

DNS w home.pl, stan na 09.10.2026: domena stoi na serwerach DNS home.pl
(`dns2.home.pl`, `dns3.home.pl`), stary hosting to `cloudserver106176.home.pl` (79.96.218.4).

| Rekord | Wartość dziś | TTL |
| --- | --- | --- |
| `@` A | `79.96.218.4` | 60 s |
| `*` CNAME | `phuprobud.pl` | 3600 s |
| `@` MX 10 | `phuprobud.pl` | |
| `@` TXT | `v=spf1 ip4:79.96.218.4 a mx -all` | |

**Pułapka:** MX i wszystkie subdomeny (rekord `*`, czyli `www`, `mail`, `smtp`, `imap`, `pop3`,
`ftp`, `webmail`, `autodiscover`) wskazują na samą domenę. Zmiana samego rekordu A przeniosłaby
na VPS także pocztę: skrzynki @phuprobud.pl przestałyby odbierać maile, a programy pocztowe
straciłyby połączenie. Dlatego najpierw poczta, potem A. Instrukcja home.pl („zmień A, nie ruszaj
MX”) tu nie wystarcza, bo MX nie wskazuje na serwer home.pl, tylko na domenę.

Rekordy edytuje się w Panelu klienta home.pl: Domeny, phuprobud.pl, moduł „Hosting DNS”,
Opcje, Zarządzaj rekordami DNS. Potrzebny jest login do konta home.pl, na którym jest domena.

### Krok 1: poczta zostaje w home.pl (dzień wcześniej, najpóźniej godzinę przed krokiem 2)

1. Rekord `*` (CNAME): wartość `phuprobud.pl` zmień na `cloudserver106176.home.pl`. Jeśli panel nie
   pozwala edytować `*`, dodaj osobne rekordy CNAME na `cloudserver106176.home.pl` dla `mail`,
   `smtp`, `imap`, `pop3`, `poczta`, `webmail`, `autodiscover` i `ftp`.
2. Dodaj rekord `www` typu CNAME z wartością `phuprobud.pl`. Bez niego `www` po kroku 1.1 trafiłoby
   na stary hosting.
3. Rekord MX: serwer `phuprobud.pl` zmień na `cloudserver106176.home.pl`, priorytet 10.
4. Rekord TXT z SPF zmień na `v=spf1 ip4:79.96.218.4 mx -all`. Bez `a`, bo po przepięciu `a`
   oznaczałoby VPS, z którego nikt nie wysyła poczty Probudu. Formularz nowej strony używa
   `mailto:`, więc serwer strony maili nie wysyła.
5. Zapytaj Probud, jaki serwer mają wpisany w Outlooku i telefonach. `mail.`, `smtp.`, `imap.`
   i `poczta.phuprobud.pl` działają dalej bez zmian. Jeśli ktoś ma wpisane samo `phuprobud.pl`,
   zmień mu serwer na `cloudserver106176.home.pl` przed krokiem 2.

Sprawdzenie po godzinie (aliasy mają TTL 3600 s):

```
nslookup -type=MX phuprobud.pl dns2.home.pl    # cloudserver106176.home.pl
nslookup smtp.phuprobud.pl dns2.home.pl         # cloudserver106176.home.pl, 79.96.218.4
nslookup www.phuprobud.pl dns2.home.pl          # alias phuprobud.pl
```

Na koniec mail testowy z zewnętrznej skrzynki (np. Gmail) na adres @phuprobud.pl i odpowiedź z niego.

### Krok 2: strona na VPS (dzień przepięcia)

1. W `astro.config.mjs` zmień `site` na `https://phuprobud.pl`. Od tego zależą adresy
   kanoniczne, mapa strony, `robots.txt`, obrazy Open Graph i dane strukturalne. Bez tej zmiany
   strona na nowej domenie wskazywałaby jako kanoniczny adres demo, który ma noindex.
2. `npm run check && npm run build`, push. Ten sam serwer co pbdevs.com: jeden push naraz,
   uzgodniony z innymi agentami.
3. W Coolify dodaj domeny `https://phuprobud.pl,https://www.phuprobud.pl` (obie, żeby
   certyfikat objął też www).
4. home.pl: rekord `@` typu A zmień z `79.96.218.4` na `135.181.253.104`. Rekordu AAAA dla `@`
   nie ma i nie dodawaj go. TTL rekordu A to 60 s, więc ruch przechodzi w kilka minut. Coolify
   wystawia certyfikat, gdy domena już wskazuje na VPS; jeśli po 10 minutach przeglądarka nadal
   pokazuje błąd certyfikatu, zrób Redeploy w Coolify.
5. Sprawdź po przepięciu:
   - `curl -sI https://phuprobud.pl/` nie zawiera `X-Robots-Tag`,
   - `curl -sI https://phuprobud.pl/bomag-bw-65/` zwraca `301` na kartę w `/oferta/`,
   - `curl -sI https://www.phuprobud.pl/` zwraca `301` na adres bez www,
   - `https://phuprobud.pl/sitemap.xml` ma adresy z `phuprobud.pl`,
   - jeszcze raz mail testowy w obie strony.

Cofnięcie: rekord `@` A z powrotem na `79.96.218.4`. Stara strona wraca w ciągu minuty. Zmian
z kroku 1 nie trzeba cofać, stary hosting działa z nimi tak samo.

Po przepięciu:

1. Google Search Console (usługa domeny `phuprobud.pl`): zgłoś `https://phuprobud.pl/sitemap.xml`,
   a dla strony głównej użyj „Poproś o zaindeksowanie”. Jeśli nikt nie ma dostępu do Search
   Console, załóż usługę i potwierdź ją rekordem `TXT` w DNS.
2. Wizytówka Google (Profil Firmy): adres strony się nie zmienia, więc wizytówki nie trzeba
   edytować. Wystarczy sprawdzić, czy link prowadzi na `https://phuprobud.pl/`.

Przez 2 do 4 tygodni po przepięciu zaglądaj w Search Console do raportu „Strony”: adresy
z błędem 404 dopisz do `RECZNE` w `src/pages/przekierowania.conf.ts`.
