# Proposal: GSL - pomoc teraz w Kolejkomacie

Status: ACCEPTED_FOR_DEV
Data: 2026-07-19
Autor: @cto
Ryzyko: LOW

## Problem

Kolejkomat odpowiada dobrze na pytanie "gdzie czeka się najkrócej", ale część użytkowników nie szuka zwykłej kolejki, tylko miejsca pomocy tu i teraz: SOR, nocna pomoc POZ, izba przyjęć albo pomoc stomatologiczna doraźna. GSL NFZ ma takie kategorie, ale są rozproszone w oficjalnym portalu.

## Proponowana zmiana

Dodać do Kolejkomatu sekcję "Pomoc teraz" z prostym wyborem sytuacji i linkiem do właściwej kategorii GSL NFZ. Nie pobieramy wyników GSL i nie scrapujemy portalu. To pierwszy bezpieczny etap: routing użytkownika do oficjalnego źródła.

## Zakres plików

- `worker/static/index.html` - nowa sekcja UI i JS do wyboru trybu pomocy.
- `pages/dist/index.html` - rebuild/copy frontendu Pages z tą samą zmianą.
- `docs/CHANGELOG.md` - wpis o integracji GSL jako deep-link.
- `README.md` - opis nowego modułu i decyzji, że etap 1 nie scrapuje GSL.

## Dane i prywatność

Zmiana nie zapisuje żadnych danych. Wybór kategorii dzieje się w przeglądarce i prowadzi do publicznej strony GSL NFZ. Nie dodajemy inputu medycznego, nowego API, cookies ani logowania.

## Bezpieczeństwo

Brak nowych sekretów, brak Cloudflare bindings, brak połączeń server-side do GSL. UI jasno mówi, że Kolejkomat nie jest serwisem NFZ i przekierowuje do oficjalnego źródła. Nie używamy logo NFZ.

## Koszt

Brak nowych kosztów. Nie ma AI, D1 ani dodatkowego fetch po stronie Workera.

## UX i dostępność

Sekcja ma proste kafle wyboru: SOR, nocna pomoc, izba przyjęć, pomoc stomatologiczna doraźna, POZ i profilaktyka. Na mobile układa się w jedną kolumnę. Tekst ma odróżniać nagły stan od zwykłego wyszukiwania kolejek.

## Testy

- [ ] `node scripts/governance_check.mjs`
- [ ] `node scripts/test_e2e.mjs`
- [ ] `npm run check`
- [ ] lokalna weryfikacja HTML zawiera linki GSL i nową sekcję.

## Rollback

Usunąć sekcję "Pomoc teraz" z `worker/static/index.html`, skopiować do `pages/dist/index.html`, cofnąć wpisy README/CHANGELOG. Brak migracji danych.

## Decyzje ownera

Deploy produkcyjny `kolejkomat.pages.dev` wymaga osobnego OK Piotra/@cto. Ten proposal dopuszcza development, nie produkcję.
