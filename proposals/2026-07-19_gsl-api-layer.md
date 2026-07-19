# Proposal: GSL API layer

Status: ACCEPTED_FOR_DEV
Data: 2026-07-19
Autor: @cto
Ryzyko: LOW

## Problem

Sekcja "Pomoc teraz" ma ręczne linki do GSL NFZ. To wystarcza jako pierwszy etap, ale jeśli Narzędzia Obywatelskie mają rosnąć jako produkt i API dla innych LLM/użytkowników, potrzebujemy spójnej warstwy maszynowej: katalog kategorii, routing intencji i stabilne endpointy.

## Proponowana zmiana

Dodać moduł `worker/src/gsl.js` oraz endpointy:

- `/api/gsl/kategorie` - publiczny katalog kategorii GSL.
- `/api/gsl/route?q=...` - dopasowanie potocznego opisu do kategorii GSL.
- `/api/gsl/link?kategoria=...` - zwrot pojedynczej kategorii i oficjalnego URL.

Na tym etapie nie pobieramy wyników wyszukiwarki GSL i nie używamy kluczy/API z cudzej strony. Endpointy służą do kierowania do oficjalnego źródła.

## Zakres plików

- `worker/src/gsl.js` - katalog kategorii, słownik intencji, normalizacja tekstu.
- `worker/src/index.js` - routing endpointów `/api/gsl/*`.
- `worker/static/index.html` - panel dopasowania kategorii GSL.
- `pages/dist/index.html` - kopia frontendu Pages.
- `pages/dist/_worker.js` - bundle Workera dla Pages.
- `scripts/test_e2e.mjs` - testy katalogu GSL, intencji i UI.
- `package.json`, `package-lock.json` - lokalny `esbuild` jako dev dependency do powtarzalnego bundla Pages.

## Dane i prywatność

Endpoint `/api/gsl/route` przyjmuje tekst zapytania, ale go nie zapisuje, nie wysyła do AI i nie wkłada do bazy. To nie jest diagnoza medyczna ani triage. Odpowiedź zawiera tylko kategorię i link do oficjalnego GSL.

## Bezpieczeństwo

Brak nowych sekretów, brak D1, brak AI, brak server-side fetch do GSL. Nie kopiujemy klucza Google Maps widocznego w publicznym HTML GSL. Linki mają stały allow-list z kodu, więc użytkownik nie może wymusić dowolnego redirectu.

## Koszt

Koszt pomijalny: lokalna logika w Workerze, bez zewnętrznych requestów i bez modeli AI. `esbuild` jest dependency developerskim, nie kosztem runtime.

## UX i dostępność

Użytkownik może wpisać po ludzku "boli ząb w nocy", "SOR", "lekarz rodzinny", "profilaktyka" i dostać 1-3 kafle prowadzące do GSL. Na mobile wynik układa się w jedną kolumnę.

## Testy

- [x] `npm run check`
- [x] `node scripts/test_e2e.mjs`
- [x] test błędnego/niepewnego wejścia: fallback do najczęściej używanych kategorii.
- [ ] screenshot desktop przed prod.
- [ ] screenshot mobile przed prod.

## Rollback

Usunąć endpointy `/api/gsl/*`, moduł `worker/src/gsl.js`, panel `gsl-router` z HTML, przebudować `pages/dist/_worker.js`. Brak migracji danych i brak danych do czyszczenia.

## Decyzje ownera

Development jest dopuszczony. Produkcyjny deploy `narzedzia-obywatelskie.pages.dev` wymaga osobnego OK Piotra/@cto.
