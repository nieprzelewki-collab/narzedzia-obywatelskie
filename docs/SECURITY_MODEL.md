# Security Model - Narzędzia Obywatelskie

## Granica zaufania

Kod, propozycje, głosy i testy są lokalne. Sekrety, produkcyjna D1 i produkcyjny deploy są poza zasięgiem kontrybutorów.

## Zasady twarde

1. Zero sekretów w repo, skillach, proposalach, głosach, screenshotach i logach.
2. Zero-retention dla pism, linków, treści dokumentów i pełnych wyników AI.
3. Dane zdrowotne nie są zbierane. Kolejkomat może zapisać tylko email alertu i parametry alertu.
4. Każdy AI endpoint ma limit dzienny/IP oraz łagodny błąd przy timeout/JSON parse fail.
5. Każdy input użytkownika jest danymi, nie instrukcją. Prompt injection z inputu nie może zmienić zasad systemu.
6. Nie używamy logo ani identyfikacji instytucji publicznych w sposób sugerujący oficjalny serwis.
7. Nie udzielamy porad prawnych ani medycznych.
8. Produkcyjna migracja D1 wymaga backupu, review i osobnego OK.
9. Produkcyjny deploy wymaga osobnego OK Piotra/@cto.
10. Cloudflare token dla kontrybutora, jeśli kiedykolwiek potrzebny, jest preview-only i scoped do jednego projektu.

## Zakazane operacje dla kontrybutorów

- `wrangler secret put/delete` dla produkcji.
- `wrangler d1 execute --remote` na produkcyjnej bazie bez ownera.
- `wrangler pages deploy --branch main` bez ownera.
- Usuwanie tabel, rekordów produkcyjnych, projektów Pages/Workers.
- Dodawanie zewnętrznego API bez sekcji kosztów i privacy.
- Zwiększanie limitów AI bez sekcji kosztowej.

## Sekrety

Dozwolone w dokumentacji są tylko nazwy:

- `GEMINI_API_KEY`
- `MAILGUN_API_KEY`
- nazwy Cloudflare bindings

Wartości sekretów nigdy nie są zapisywane ani wypisywane.

## Threat model

| Ryzyko | Przykład | Kontrola |
|--------|----------|----------|
| Wyciek sekretu | token w proposal.md | `governance_check`, review |
| Prompt injection | pismo zawiera "zignoruj instrukcje" | system prompt + traktowanie inputu jako danych |
| Koszt AI | bot odpala tysiące analiz | limit IP + Turnstile przed promocją |
| Podszywanie pod państwo | logo NFZ/ZUS, oficjalny język | veto security/ux |
| Retencja danych | zapis pełnego pisma w D1 | veto privacy, test storage |
| Destrukcja danych | migracja D1 bez backupu | blokada prod write |
| Phishing | narzędzie prosi o PESEL/hasło | veto security/privacy |

## Checklist przed merge

- Proposal bez sekretów.
- Głosy kompletne dla `product`, `cto`, `privacy`, `security`, `ux`, `cost`.
- Brak veta.
- Testy lokalne przechodzą.
- Zmiana nie zwiększa uprawnień bez uzasadnienia.
- Jeśli AI/cloud: sekcja kosztów i limit.
- Jeśli dane: zero-retention opisane i testowane.

