# Zasady projektu phuprobud

Wspólne zasady dla całego `E:\ENTERPRISE` są w `../AGENTS.md` i `../CLAUDE.md`. Tu tylko to,
co dotyczy tej strony.

- **Język**: kod, komentarze i teksty po polsku. Komentarze w kodzie bez polskich znaków
  (tak jak w reszcie plików), commity też bez polskich znaków.
- **Teksty na stronę**: zasady z `../piatek-bilski/docs/tresci/jak-piszemy.md`: fakty zamiast
  przymiotników, bez półpauz i pauz, „…”, twarde spacje (funkcja `sierotki()` w `src/lib/tekst.ts`).
  Każde twierdzenie o maszynie ma źródło w danych katalogu albo na starej stronie Probudu.
- **Katalog**: `src/data/zrodla/katalog-astra.json` to dane ze źródłami, nie edytuj ich ręcznie.
  Redakcja (grupy, opisy, kolejność, etykiety) jest w `src/data/katalog.ts`. Build padnie,
  jeśli model nie ma grupy albo opisu.
- **Panel `/admin/`** (demo, localStorage): teksty do edycji są w `src/data/tresci.ts`, element na
  stronie dostaje `data-tresc="klucz"`. Nowy tekst na stronie, który ma być edytowalny, idzie przez
  ten plik. Zdjęć osób na stronie nie pokazujemy.
- **Zdjęcia**: tylko przez `scripts/obrazy.lista.mjs` + `npm run obrazy`. Komponent `Foto`
  rzuca błąd, gdy zdjęcia nie ma w manifeście.
- **Grafika generowana** (Codex `image_gen`) tylko do rzeczy, które nie udają faktów
  (piktogramy, ikona telefonu, scena tła strony głównej). Maszyn i ludzi nie generujemy.
  Tło: `zrodla/oryginaly/tlo/` → `npm run obrazy`, komponent `TloStrony.astro`.
- **Build ma zostać lekki**: bez przetwarzania obrazów w `npm run build`. Serwer Coolify dzieli
  pamięć z kilkudziesięcioma aplikacjami; jeden push naraz.
- **Przed pushem**: `npm run check` i `npm run build`, rozdzielone `&&`.
