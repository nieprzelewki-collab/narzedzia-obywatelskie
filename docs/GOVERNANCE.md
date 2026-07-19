# Governance - Narzędzia Obywatelskie

## Cel

Umożliwić grupie ludzi i agentów rozwijanie narzędzi bez bezpośredniego dostępu do produkcji, sekretów i danych. Głosowanie agentów jest bramką jakości, a nie prawem do deployu.

## Role głosujące

| Rola | Zakres | Veto |
|------|--------|------|
| product | sens problemu, jasność wartości dla użytkownika | nie |
| cto | architektura, testy, utrzymanie, deploy path | tak dla produkcji i infrastruktury |
| privacy | zero-retention, RODO, dane zdrowotne/pisma/linki | tak |
| security | sekrety, prompt injection, nadużycia, phishing, podszywanie | tak |
| ux | zrozumiałość, dostępność, mobile, język | nie |
| cost | limity AI/cloud, ryzyko pętli kosztowej | tak |

## Statusy propozycji

| Status | Znaczenie |
|--------|-----------|
| DRAFT | pomysł spisany, jeszcze bez głosowania |
| NEEDS_INFO | brakuje informacji albo testów |
| REJECTED | veto albo większość przeciw |
| PARKED | dobry pomysł, ale nie teraz |
| ACCEPTED_FOR_DEV | można robić patch/prototyp |
| READY_FOR_REVIEW | patch gotowy, testy przechodzą |
| APPROVED_FOR_PREVIEW | można publikować preview |
| APPROVED_FOR_PROD | owner dał osobne OK na produkcję |

## Reguła decyzji

Proposal przechodzi do dev, gdy:

- nie ma veta `security`, `privacy`, `cost` ani `cto`,
- minimum 4 z 6 ról głosuje `pass`,
- proposal ma testy i plan rollbacku,
- proposal nie zawiera wzorców sekretów ani danych prywatnych.

Proposal nie może przejść automatycznie do produkcji. Produkcja wymaga jawnego OK Piotra/@cto po review.

## Kategorie ryzyka

| Kategoria | Przykłady | Bramka |
|-----------|-----------|--------|
| LOW | copy, układ, link, drobny CSS | 3/6 pass, brak veta |
| MEDIUM | nowy endpoint, nowe narzędzie bez AI, nowa tabela dev | 4/6 pass, @cto pass |
| HIGH | AI, D1 prod, Cloudflare config, dane użytkowników | 4/6 pass + security/privacy/cost/cto pass |
| BLOCKED | sekrety w patchu, brak zero-retention, oficjalne podszycie, destrukcja danych | odrzut |

## Artefakty

- `proposals/*.md` - opis pomysłu i ryzyk.
- `votes/*.json` - głosy agentów i wynik.
- `docs/SECURITY_MODEL.md` - granice bezpieczeństwa.
- `docs/DEVELOPMENT_PROTOCOL.md` - jak technicznie dodawać zmiany.
- `skills/np-civic-tools/SKILL.md` - instrukcja dla agentów.

## Produkcja

Żaden agent ani kontrybutor nie dostaje domyślnie prawa do produkcji. Preview może być dopuszczone osobnym scoped tokenem Cloudflare, ale prod deploy zostaje u Piotra/@cto.

