# Development Protocol - Narzędzia Obywatelskie

## Lokalny tryb pracy

1. Przeczytaj `README.md`, `docs/GOVERNANCE.md` i `docs/SECURITY_MODEL.md`.
2. Utwórz proposal z `proposals/_TEMPLATE.md`.
3. Uruchom walidator:

```bash
node scripts/governance_check.mjs proposals/twoj-plik.md
```

4. Dopiero po `ACCEPTED_FOR_DEV` zmieniaj kod.
5. Po zmianie uruchom testy bazowe:

```bash
node scripts/test_e2e.mjs
node scripts/governance_check.mjs
```

6. Dla UI zrób screenshot desktop i mobile. Dla AI zrób test poprawnego wejścia, błędnego wejścia i limitu.

## Dodanie narzędzia 04

Minimalny zestaw:

- osobny folder `narzedzie04/` albo nazwa domenowa narzędzia,
- `dist/index.html`,
- `dist/_worker.js` tylko gdy potrzeba API,
- `wrangler.toml` bez sekretów,
- limit dzienny/IP, jeśli narzędzie używa AI,
- disclaimer prawny/medyczny, jeśli dotyczy,
- zero-retention,
- link w `parasol/dist/index.html`,
- wpis w `docs/CHANGELOG.md`,
- test smoke.

## UI

Styl parasola:

- czarne tło,
- stalowe plansze,
- lime accent,
- numeracja 01/02/03/04,
- `Anton` + `Space Mono`,
- polski język na pierwszym ekranie,
- zdjęcia ludzi bez rozpoznawalnych twarzy,
- brak logo instytucji publicznych,
- mobile sprawdzony minimum na `390x844`,
- laptop 13 cali sprawdzony minimum na `1280x800`.

## Cloudflare

Deploy produkcji jest osobną decyzją. Kontrybutor nie odpala produkcji samodzielnie.

Preview, jeśli zostanie dopuszczone:

- osobny projekt albo preview branch,
- scoped token,
- bez D1 prod write,
- bez sekretów produkcyjnych,
- po preview smoke test i raport.

## Definition of Done

- Proposal zaakceptowany.
- Kod zgodny z security model.
- Testy przechodzą.
- Screenshoty albo testy AI dołączone.
- Changelog zaktualizowany.
- Rollback opisany.
- Prod deploy tylko po osobnym OK ownera.

