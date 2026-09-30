# Projekt strony PHU Probud (demo PB Devs)

Stan: 30.09.2026. Skąd wzięły się decyzje: research Pinteresta (Astra, 209 pinów, kierunki A/B/C),
audyt naszych dotychczasowych stron (lista „nie powtarzać”) i zrzut starej strony phuprobud.pl.

## Dla kogo i po co

Firmy budowlane i drogowe, brukarze, gminy, wypożyczalnie, rolnicy z Wielkopolski i Kujaw.
Dzwonią, porównują modele po masie i szerokości roboczej. Strona ma doprowadzić do telefonu
albo zapytania o konkretną maszynę. Dalej: katalog, dojazd, serwis, części.

## Kolor

Paleta pochodzi z materiału, nie z wyobraźni: żółć spróbkowana ze zdjęć BOMAG (#F8D800),
czerwień i szarość z logo Probud (#881810, #505050).

| Token | Hex | Rola |
| --- | --- | --- |
| `--papier` | `#FFFFFF` | tło bazowe |
| `--beton` | `#ECECE8` | powierzchnie naprzemienne, panele katalogu |
| `--grafit` | `#222222` | tekst, ciemne moduły (galeria, stopka) |
| `--stal` | `#55565A` | tekst drugorzędny (kontrast 7:1 na bieli) |
| `--probud` | `#881810` | duże pole w hero, znak firmy, aktywne stany |
| `--zolty` | `#F6CF00` | pola bez żółtych maszyn: handlowcy, mapa, fokus |

Żółta maszyna na żółtym polu znika, dlatego maszyny BOMAG stoją na czerwieni, bieli albo betonie.

## Typografia

- **Big Shoulders** (zmienna, opsz): nagłówki, wielkie oznaczenia modeli, numery telefonów.
- **Sofia Sans** (zmienna): tekst, tabele parametrów (cyfry tabelaryczne), formularz.
- Żadnych wersalików w etykietach, żadnego kroju mono.

## Kształt

Znak Probud to prostokąt przecięty ukosem, z jednym zaokrąglonym narożnikiem. Z niego:
kadry zdjęć i panele mają JEDEN duży zaokrąglony róg (lewy dolny), reszta prosta. Przyciski
prostokątne. Bez cieni pod kartami.

## Układ

- Siatka 12 kolumn, maks. 1440 px, tekst wyrównany do lewej, kompozycje asymetryczne.
- Hero typograficzne na całą szerokość: „MASZYNY” grafitem na bieli, „BUDOWLANE” bielą na
  czerwonym pasie. Walec BOMAG wjeżdża między wiersze: zasłania dolny wiersz, górny zasłania
  jego. Jedna sekwencja wejścia (pas, litery, przejazd walca). Lekka głębia: warstwy przesuwane
  kursorem, bez perspektywy CSS (była już na pbdevs.com i Onyx). Na dotyku statycznie.
- Oferta: indeks kategorii jako wiersze (nazwa, liczba modeli, zakres mas), obraz maszyny
  zmienia się po najechaniu. Nie siatka kafli.
- Teren dealera: scena 3D (Three.js) z wojewódzkimi płytami; wielkopolskie i kujawsko-pomorskie
  podniesione. Ładowana, gdy sekcja wchodzi w ekran; bez WebGL rysunek SVG.
- Handlowcy: dwa portrety na żółtych polach, wielkie numery jako `tel:`.
- Realizacje: jeden kadr na ciemnym module, licznik, strzałki, pasek miniatur, przeciąganie.
- Kontakt w trzech pasach, nie „tekst z lewej, formularz z prawej” (ten układ mają już Karta
  Pola, Dutkiewicz i CartBot): centrala działów z dużymi numerami, formularz na całą szerokość
  z wyborem działu (wiadomość trafia na właściwy adres), autorska mapa MapLibre (prawdziwe
  ulice OSM, własny styl: grafitowe drogi na żółtym tle).

## Przegląd planu przed kodem

Sprawdzone względem audytu i listy domyślnych wzorców: hero „tekst/obraz” i kontakt
„tekst/formularz” zmienione (patrz wyżej). Bez kremowego tła, bez ciemnej strony z jednym
akcentem, bez kart z cieniem, bez nadpisów wersalikami, bez „·” w metadanych, bez strzałek
doklejanych do linków, bez kroju mono. Ciemne są tylko moduł galerii i stopka.

## Ruch

Jedna sekwencja w hero. Reszta tylko w odpowiedzi na działanie: zmiana obrazu kategorii,
przejście galerii, obrót sceny 3D. `prefers-reduced-motion` wyłącza wszystko poza zmianą stanu.

## Teksty

Zasady z `piatek-bilski/docs/tresci/jak-piszemy.md`: fakty z raportu zrzutu, bez przymiotników
-obietnic, bez półpauz i pauz, „…”, twarde spacje po jednoliterowych słowach.
