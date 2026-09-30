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
