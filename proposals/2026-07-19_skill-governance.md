# Proposal: skill governance dla Narzędzi Obywatelskich

Status: ACCEPTED_FOR_DEV
Data: 2026-07-19
Owner: Piotr / @cto

## Problem

Projekt Narzędzi Obywatelskich może być rozwijany przez kilka osób lub agentów, ale bez procesu łatwo dopuścić zmiany, które naruszą prywatność, wrzucą sekret do plików, zwiększą koszty albo zrobią deploy bez świadomej zgody ownera.

## Proponowana zmiana

Dodać lokalny skill i lekki system governance: proposal, głosowanie sześciu ról, veto dla obszarów krytycznych, walidator plików oraz osobny gate produkcji.

## Zakres plików

- `skills/np-civic-tools/SKILL.md`
- `docs/GOVERNANCE.md`
- `docs/SECURITY_MODEL.md`
- `docs/DEVELOPMENT_PROTOCOL.md`
- `proposals/_TEMPLATE.md`
- `votes/_TEMPLATE.json`
- `scripts/governance_check.mjs`
- `.gitignore`
- `README.md`
- `docs/CHANGELOG.md`

## Dane i prywatność

Nie dodajemy nowych danych użytkowników. Mechanizm opisuje rozwój projektu i nie wymaga eksportu danych poza repo. Proposal i głosy nie mogą zawierać danych wrażliwych, sekretów, logów z treścią pism ani danych zdrowotnych.

## Bezpieczeństwo

Produkcja zostaje poza automatycznym głosowaniem. Walidator blokuje typowe wzorce sekretów i niespójne głosy. Role `cto`, `privacy`, `security` i `cost` mają veto.

## Koszt

Koszt uruchomienia jest zerowy, bo to pliki repo i skrypt Node bez zależności. Potencjalne przyszłe koszty muszą być opisane w każdym osobnym proposal.

## UX i dostępność

Brak zmian w UI użytkownika końcowego. UX dotyczy procesu współpracy: szablony mają być krótkie, czytelne i wymagają rollbacku oraz testów przed pracą.

## Testy

- `node --check scripts/governance_check.mjs`
- `node scripts/governance_check.mjs`
- `node scripts/governance_check.mjs proposals/_TEMPLATE.md votes/_TEMPLATE.json`
- `node scripts/governance_check.mjs proposals/2026-07-19_skill-governance.md votes/2026-07-19_skill-governance.json`

## Rollback

Usunąć dodane pliki governance/skilla i przywrócić README oraz changelog do poprzedniego stanu. Nie wymaga rollbacku Cloudflare, bo nie dotyka produkcji.

## Decyzje ownera

Owner akceptuje lokalny mechanizm governance jako proces rozwoju. Osobna zgoda ownera nadal jest wymagana przed realnym deployem produkcyjnym i przed nadaniem ludziom lub agentom dostępu do repo, Cloudflare albo sekretów.
