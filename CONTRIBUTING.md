# Jak rozwijać Narzędzia Obywatelskie

Ten projekt przyjmuje zmiany przez propozycję, głosowanie agentów i review ownera. Celem jest szybkie ulepszanie narzędzi bez ryzyka dla produkcji, danych użytkowników i kosztów.

## Zasada główna

Kontrybutorzy mogą przygotowywać patch, prototyp albo preview. Produkcja, sekrety, migracje D1 i limity kosztów pozostają pod kontrolą Piotra/@cto.

## Minimalny przepływ

1. Sprawdź stan lokalnego skilla:

```bash
npm run np-civic -- status
npm run np-civic -- update-check
```

2. Utwórz proposal:

```bash
npm run np-civic -- proposal krotka-nazwa
```

3. Wypełnij problem, zmianę, ryzyka, pliki, testy i wpływ na dane/koszty.
4. Jeśli proposal dotyka danych, AI, Cloudflare, D1, sekretów albo produkcji, przygotuj głosy:

```bash
npm run np-civic -- vote krotka-nazwa
```

5. Uruchom walidację:

```bash
npm run np-civic -- validate
```

6. Zmiana może wejść do kodu dopiero po statusie `ACCEPTED_FOR_DEV`.
7. Deploy produkcyjny wymaga osobnego OK Piotra/@cto, niezależnie od wyniku głosowania.

## Czego nie wolno

- Nie zapisuj sekretów w repo, skillu, proposalach ani logach.
- Nie loguj treści pism, linków użytkowników, danych zdrowotnych ani pełnych wyników AI.
- Nie używaj logo NFZ, ZUS, sądów, ministerstw ani layoutu sugerującego oficjalny serwis państwowy.
- Nie dodawaj porad prawnych ani medycznych.
- Nie zwiększaj limitów AI/cloud bez sekcji kosztowej i zgody ownera.
- Nie wykonuj prod deployu jako część kontrybucji.

## Testy bazowe

```bash
npm run check
npm test
```

Przy zmianach UI wymagany jest screenshot desktop i mobile. Przy zmianach AI wymagany jest test błędnych inputów, limitu dziennego i zero-retention.
