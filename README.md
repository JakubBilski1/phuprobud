# PHU Probud: nowa strona (wersja demonstracyjna)

Demo nowej strony dla PHU Probud (maszyny budowlane, Komorniki), przygotowane przez PB Devs.
Adres: https://phuprobud.pbdevs.com. Strona ma `noindex` (meta i nagłówek `X-Robots-Tag`),
żeby nie konkurowała w wyszukiwarce z phuprobud.pl.

Założenia projektu, paleta, typografia i decyzje: [docs/PROJEKT.md](docs/PROJEKT.md).

## Co jest na stronie

- **Strona główna**: hero, maszyny nowe (indeks ośmiu grup), teren dealera BOMAG (scena 3D),
  maszyny używane (odsyłacz do otomoto), dwóch handlowców z numerami, finansowanie BPCE,
  realizacje (18 zdjęć w jednym kadrze), kontakt: działy, formularz, mapa dojazdu.
- **`/oferta/`**: katalog 41 modeli BOMAG, Schaeff i Gehl.
- **`/oferta/<grupa>/`**: grupa z tabelą porównania modeli.
- **`/oferta/<grupa>/<model>/`**: karta modelu z parametrami i kartą katalogową producenta.
- **Przekierowania 301** ze wszystkich adresów starej strony, generowane z danych katalogu
  (`src/pages/przekierowania.conf.ts` → konfiguracja nginx w obrazie).

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
| `python scripts/wytnij-portrety.py` | Wycięcie tła z portretów handlowców (`rembg`, `u2net_human_seg`). |
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
- Zdjęcia: stara strona phuprobud.pl (realizacje), zdjęcia producentów (BOMAG, Schaeff/Yanmar,
  Gehl/Manitou), portrety: ewpa.pl (Krzysztof Bilski) i monitorrynkowy.pl (Szymon Atraszkiewicz).
- Piktogramy maszyn: wygenerowane (Codex, `image_gen`), `public/piktogramy/`.
- Mapa: dane OpenStreetMap z kafli OpenFreeMap (bez klucza API). Granice województw: Natural
  Earth (domena publiczna).

## Przed przejściem z demo na produkcję

- **Numer 601 416 618** jest na stronie przypisany Szymonowi Atraszkiewiczowi. Strona ewpa.pl
  podaje go przy Marcinie Maju. Do potwierdzenia w Probudzie (`src/data/firma.ts`).
- **Zdjęcia handlowców** pochodzą z publicznych źródeł; na produkcję potrzebna zgoda albo sesja.
- **Formularz** w demo składa gotową wiadomość w programie pocztowym (`mailto:` na adres
  wybranego działu). Wysyłka z serwera: ustawić `PUBLIC_FORMULARZ_URL` na endpoint, który
  przyjmuje JSON `{ dzial, do, temat, tresc }`.
- **Schaeff SV15, SV17, SV22**: brak potwierdzonych parametrów, zdjęcia 300 px. **Gehl RT185,
  RT215**: brak masy roboczej w dostępnej karcie, małe zdjęcia. BW 65 D pokazuje zdjęcie BW 65
  z podpisem.
- Zdjąć `noindex` (layout i `nginx/naglowki.conf`) i ustawić domenę docelową w `astro.config.mjs`.

## Wdrożenie

Coolify: projekt `apps`, aplikacja z GitHub App `bilski-github-apps`, build pack **Dockerfile**,
port **80**, domena `phuprobud.pbdevs.com`. Obraz: `node:24-alpine` (build Astro, ok. 30 s,
bez przetwarzania obrazów) → `nginx:1.29-alpine`. Serwer dzieli pamięć z innymi aplikacjami,
więc jeden push naraz.
