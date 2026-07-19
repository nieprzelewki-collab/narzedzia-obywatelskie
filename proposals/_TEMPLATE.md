# Proposal: [krótka nazwa]

Status: DRAFT
Data: RRRR-MM-DD
Autor: [osoba/agent]
Ryzyko: LOW | MEDIUM | HIGH | BLOCKED

## Problem

[Jaki problem użytkownika rozwiązujemy?]

## Proponowana zmiana

[Co dokładnie zmieniamy lub dodajemy?]

## Zakres plików

- `[ścieżka]` - [co się zmieni]

## Dane i prywatność

[Czy dotyka pism, linków, emaili, danych zdrowotnych, IP albo wyników AI? Jak działa zero-retention?]

## Bezpieczeństwo

[Prompt injection, podszywanie pod instytucje, sekrety, abuse, rate limit, Turnstile.]

## Koszt

[Czy używa AI/cloud? Jaki limit? Co zatrzymuje pętlę kosztową?]

## UX i dostępność

[Desktop, mobile, język, czy użytkownik rozumie co robi narzędzie.]

## Testy

- [ ] `node scripts/governance_check.mjs proposals/[plik].md`
- [ ] `node scripts/test_e2e.mjs`
- [ ] screenshot desktop, jeśli UI
- [ ] screenshot mobile, jeśli UI
- [ ] test błędnego wejścia, jeśli API/AI
- [ ] test limitu, jeśli AI

## Rollback

[Jak wrócić bez utraty danych?]

## Decyzje ownera

[Co wymaga Piotra/@cto przed preview/prod?]

