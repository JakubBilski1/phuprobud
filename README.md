# PHU Probud: nowa strona (wersja demonstracyjna)

Demo nowej strony dla PHU Probud (maszyny budowlane, Komorniki), przygotowane przez PB Devs.
Adres: https://phuprobud.pbdevs.com. Strona ma `noindex` (meta i nagłówek `X-Robots-Tag`),
żeby nie konkurowała w wyszukiwarce z phuprobud.pl.

Założenia projektu, paleta, typografia i decyzje: [docs/PROJEKT.md](docs/PROJEKT.md).

## Co jest na stronie

- **Strona główna**: hero, maszyny nowe (indeks sześciu grup), teren dealera BOMAG (scena 3D),
  maszyny używane (odsyłacz do otomoto), ludzie bez zdjęć (tylko osoby z numerem: rola,
  imię i telefon), finansowanie BPCE,
  realizacje (19 zdjęć w jednym kadrze, cała galeria mieści się na ekranie), kontakt: działy, formularz, mapa dojazdu.
- **`/oferta/`**: katalog 31 modeli BOMAG.
- **`/oferta/<grupa>/`**: grupa z tabelą porównania modeli.
- **`/oferta/<grupa>/<model>/`**: karta modelu z parametrami i kartą katalogową producenta.
- **`/admin/`**: panel strony, patrz niżej.
- **Przekierowania 301** ze wszystkich adresów starej strony, generowane z danych katalogu
  (`src/pages/przekierowania.conf.ts` → konfiguracja nginx w obrazie).

## Panel `/admin/`

Panel do edycji strony: widoczność modeli i grup, opisy, etykiety i ceny, teksty sekcji, galeria
realizacji, zdjęcia w sekcji „Maszyny używane”, osoby, telefony, e-maile i pasek ogłoszenia.

- **Zapis**: zmiany idą przez API (`src/pages/api/panel/`) do Postgresa jako różnica względem
  treści z repozytorium. Serwer trzyma je w pamięci (`src/data/stan.ts`) i renderuje z nimi strony,
  więc zapis jest od razu widoczny dla wszystkich odwiedzających i w kodzie HTML (ważne dla SEO).
  Ukryty model albo grupa zwraca 404 i znika z mapy strony.
- **Logowanie**: konta w bazie (login to e-mail), hasło jako skrót scrypt, potem obowiązkowy
  6-cyfrowy kod wysłany na ten e-mail (pbdevs-mail, skrzynka PB Devs), sesja w ciasteczku `HttpOnly`, limit nieudanych
  prób. Nowe konto loguje się hasłem startowym (`PANEL_HASLO_STARTOWE`) i dopóki nie ustawi
  własnego, panel nie zapisuje zmian.
- **Zdjęcia z dysku**: przeglądarka zmniejsza je do 2000 px i miniatury 640 px, serwer zapisuje
  oba pliki w bazie i podaje spod `/media/`.
- **Bezpieczeństwo zapisu**: serwer przyjmuje tylko znane klucze i sprawdza wartości
  (`src/server/walidacja.ts`); 50 ostatnich zapisów zostaje w tabeli `panel_historia`.

Lokalnie panel potrzebuje Postgresa: ustaw `DATABASE_URL` i `PANEL_HASLO_STARTOWE` przed
`npm run dev` i dodaj konto zapytaniem z `docs/WDROZENIE.md`. Bez kluczy pbdevs-mail kod logowania pojawia się w konsoli serwera
(tylko w trybie deweloperskim). Bez bazy strona działa na treści z repozytorium, a panel
informuje o braku bazy.
Konfiguracja na serwerze: [docs/WDROZENIE.md](docs/WDROZENIE.md).

## Uruchomienie

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # dist/
npm run preview    # podgląd zbudowanej strony
npm run check      # typecheck (astro check)
```

W trybie `dev` mapa dojazdu się nie wczyta: MapLibre 6 jest podawany jako statyczne moduły
z `public/vendor/`, a serwer deweloperski Vite przechwytuje pliki `.mjs`. W `build` + `preview`
i na produkcji działa. Scena 3D i reszta strony działają też w `dev`.

## Skrypty

| Polecenie | Co robi |
| --- | --- |
| `npm run obrazy` | WebP w kilku szerokościach + `src/data/obrazy.json`. Wymaga oryginałów w `zrodla/oryginaly/` i wycięć w `zrodla/wyciecia/` (poza gitem). |
| `npm run marka` | Logo Probud w wersji na jasne tło i logotypy producentów do `public/`. |
| `python scripts/wytnij-maszyny.py` | Wycięcie tła ze zdjęć maszyn bez przezroczystości (`rembg`, `isnet-general-use`). |
| `scripts/vendor.mjs` | Kopiuje MapLibre do `public/vendor/`; uruchamia się sam przed `dev` i `build`. |
| `scripts/teren.mjs` | Granice województw (Natural Earth) → `src/data/teren.json`; jednorazowo. |

Zoptymalizowane zdjęcia (`public/img/`) są w repozytorium, więc build na serwerze niczego
nie przelicza.

## Dane i źródła

- `src/data/firma.ts`: kontakty, adres, NIP, REGON, konta. Źródło: phuprobud.pl i regulamin
  sprzedaży (PDF). Współrzędne: OpenStreetMap Nominatim.
- `src/data/zrodla/katalog-astra.json`: katalog maszyn z parametrami i źródłem każdej wartości
  (PDF-y hostowane przez Probud, karty producentów). **Nie edytować ręcznie.** Nazwy grup,
  opisy i kolejność są w `src/data/katalog.ts`.
- Zdjęcia: od Probudu (realizacje i maszyny używane, październik 2026), stara strona
  phuprobud.pl (7 realizacji), zdjęcia producenta (BOMAG).
  Zdjęć osób na stronie nie ma.
- Piktogramy maszyn i ikona telefonu: wygenerowane (Codex, `image_gen`), `public/piktogramy/`,
  `public/ikony/`.
- Tło strony głównej: przekrój drogi (niebo, asfalt, kruszywo, piasek, grunt), wygenerowany
  (Codex, `image_gen`, bez maszyn i ludzi), przypięty za treścią i przesuwany przy przewijaniu
  (`TloStrony.astro`).
- Mapa: dane OpenStreetMap z kafli OpenFreeMap (bez klucza API). Granice województw: Natural
  Earth (domena publiczna).

## Ludzie i numery (stan 30.09.2026)

| Numer | Na stronie | Źródło przypisania |
| --- | --- | --- |
| 601 896 689 | Krzysztof Bilski, sprzedaż maszyn | ewpa.pl/kontakt (karta osoby) |
| 601 416 618 | Marcin Maj, sprzedaż maszyn | ewpa.pl/kontakt (karta osoby) |
| 693 221 733 | Tomasz Jurga, części zamienne | ewpa.pl/kontakt (karta osoby) |
| 662 997 955 | dział serwisu (EWPA), bez osoby | phuprobud.pl; brak imiennego przypisania w sieci |
| 722 223 755 | administracja, bez osoby | phuprobud.pl; katalogi firm podają go jako numer firmy |

Na stronie głównej są tylko osoby z własnym numerem, każda z rolą i telefonem. Zdjęć osób nie
pokazujemy.

## Przed przejściem z demo na produkcję

- **Formularz** w demo składa gotową wiadomość w programie pocztowym (`mailto:` na adres
  wybranego działu). Wysyłka z serwera: ustawić `PUBLIC_FORMULARZ_URL` na endpoint, który
  przyjmuje JSON `{ dzial, do, temat, tresc }`.
- BW 65 D pokazuje zdjęcie BW 65 z podpisem.
- Ustawić domenę docelową w `astro.config.mjs` (`noindex` zależy od hosta i zdejmuje się sam, patrz
  `docs/WDROZENIE.md`).

## Wdrożenie

Szczegóły: [docs/WDROZENIE.md](docs/WDROZENIE.md). W skrócie: Coolify, projekt `apps`, środowisko
`production`, aplikacja `phuprobud` z GitHub App `bilski-github-apps`, build pack **Dockerfile**,
port **80**, domena `https://phuprobud.pbdevs.com` (NoIndex). Push do `main` wdraża automatycznie.
Build na serwerze trwa ok. 25 s (bez przetwarzania obrazów). Baza `probud` na `pbdevs-postgres`
i zmienna `DATABASE_URL` jak w pozostałych aplikacjach: w bazie leżą zmiany z panelu `/admin/`,
konto panelu i wgrane zdjęcia.
