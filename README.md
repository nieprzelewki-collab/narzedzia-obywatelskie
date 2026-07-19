# Narzędzia Obywatelskie - rodzina MVP

> Projekt obywatelski (venture, izolowany od NP): proste narzędzia, które tłumaczą publiczne dane i trudne pisma na ludzki język.
> Status: **3/3 narzędzia live 19.07.2026**: Kolejkomat, Urzędomat, Czytomat + parasol `narzedzia-obywatelskie.pages.dev`.

## Co robi

1. **Kolejkomat** - "okulista" / "ortopeda" / "zdrowie psychiczne" -> tłumaczenie na nomenklaturę NFZ
   (mapa synonimów + fuzzy ze stemmingiem po pełnym słowniku) -> lista placówek z terminem, adresem, telefonem
   do rejestracji, posortowana wg najkrótszego oczekiwania. Opcjonalnie sortowanie wg odległości (geolokalizacja
   w przeglądarce, haversine client-side).
2. **Alert kolejkowy Kolejkomatu** - e-mail, gdy najkrótszy termin dla (świadczenie, województwo) skróci się o >= 14 dni.
   Cron 1x dziennie, diff vs snapshot w D1, wysyłka Mailgun. Link wypisu w każdej wiadomości.
3. **Urzędomat** - wklejasz pismo z ZUS, US, sądu albo gminy, dostajesz: co to znaczy, kroki, termin, konsekwencje i szkic odpowiedzi. Zero-retention: treść nie jest zapisywana.
4. **Czytomat** - wklejasz link do artykułu, ustawy, rozporządzenia albo PDF, dostajesz streszczenie, punkty, znaczenie praktyczne i słowniczek. Zero-retention: linki i treści nie są zapisywane.

## Produkcja

| Narzędzie | URL | Cloudflare |
|-----------|-----|------------|
| Parasol | https://narzedzia-obywatelskie.pages.dev | Pages `narzedzia-obywatelskie` |
| Kolejkomat | https://kolejkomat.pages.dev | Pages `kolejkomat` + Worker `kolejkomat` dla crona |
| Urzędomat | https://urzedomat.pages.dev | Pages `urzedomat` |
| Czytomat | https://czytomat.pages.dev | Pages `czytomat` |

Worker `kolejkomat.workers.dev` robi 301 do `kolejkomat.pages.dev`; cron alertów zostaje na Workerze, bo Pages nie ma scheduled handlers.

## Architektura

```
parasol/
  dist/index.html  landing rodziny 01-03
  dist/_worker.js  statyczny assets handler bez dostępu do D1
  wrangler.toml    Pages `narzedzia-obywatelskie`
pages/
  dist/            Kolejkomat jako Pages (frontend + API w _worker.js)
  wrangler.toml    Pages `kolejkomat`
urzedomat/
  dist/            Urzędomat, Gemini + JSON schema, limit 10/dzień/IP
  wrangler.toml    Pages `urzedomat`
czytomat/
  dist/            Czytomat, HTML/PDF przez Gemini, limit 10/dzień/IP
  wrangler.toml    Pages `czytomat`
worker/
  src/index.js     router + API + cron alertów (Cloudflare Worker)
  src/nfz.js       adapter API NFZ ITL v1.4 (backoff na 429!)
  src/mapping.js   synonimy + fuzzy + kody województw (01-16 = OW NFZ)
  data/benefits.json  snapshot słownika świadczeń (562 pozycje, zebrany 19.07.2026)
  static/index.html   źródło frontendu Kolejkomatu
  schema.sql       D1: alerty, snapshoty, usage limity, historyczna waitlista
  wrangler.toml    Worker `kolejkomat` - cron alertów + redirect workers.dev -> pages.dev
scripts/test_e2e.mjs  testy: mapping + parser + żywe API NFZ
scripts/governance_check.mjs  walidacja proposal/votes pod skill współpracy
```

Źródło danych Kolejkomatu: **API NFZ "Informator o Terminach Leczenia" v1.4** - `https://apinfz.nfz.gov.pl/app-itl-api-pcus/`.
Publiczne, bez klucza, JSON. Endpointy: `/queues` (kolejki), `/benefits` (słownik, wymaga `name` >= 3 znaki).

## Fakty zweryfikowane u źródła (19.07.2026)

- API NFZ działa bez autoryzacji; **rate limit agresywny** (429 przy kilku req/s) -> adapter ma backoff, cron odpytuje sekwencyjnie z pauzą 2,5 s.
- Rekord kolejki zawiera: prognozowany czas (`dates.pcus`), stan na dzień, placówkę, adres, telefon, statystyki, geo, "przyjmuje dzieci".
- Dane NFZ aktualizowane ~miesięcznie (stan na 1. dzień miesiąca) -> alerty = "kolejka wyraźnie się skróciła", nie "zwolnił się termin jutro".
- Poradnie kardiologiczne od 01.07.2026 są w centralnej e-rejestracji; Kolejkomat pokazuje szpitalne oddziały kardiologiczne + notę kierującą na pacjent.gov.pl / mojeIKP / 800 190 590.
- `/benefits` limit max 25/stronę; wyszukiwarka słownika kapryśna -> słownik trzymamy jako lokalny snapshot.

## Znane ograniczenia MVP

- **Geo tylko dla części placówek** (np. mazowieckie: 1/25 w teście 19.07) - sortowanie wg odległości częściowe; placówki bez geo lądują na końcu. TODO: geokodowanie po `locality` (statyczna tabela miejscowości).
- Wyszukiwanie po województwie, nie po promieniu km od adresu (wymaga geokodowania jw.).
- Brak double opt-in dla alertów Kolejkomatu (TODO przed szerszym launchem - higiena + RODO).
- E-mail alertów przez Mailgun (sekret `MAILGUN_API_KEY` przez `wrangler secret put`, NIGDY w plikach). Bez konfiguracji = dry-run do logów.
- Słownik świadczeń to snapshot - TODO: cron odświeżający raz w miesiącu.
- Parasol jest statyczny i nie ma już waitlisty ani dostępu do D1.
- Urzędomat i Czytomat mają limit 10 analiz/dzień/IP; przed szerszą promocją warto dodać Turnstile.

## Rozwój przez skill

Projekt ma lokalny skill `skills/np-civic-tools/SKILL.md` do bezpiecznego rozwoju przez agentów i ludzi. Zasada: każdy większy pomysł najpierw trafia do `proposals/`, potem do `votes/`, a dopiero po przejściu głosowania może wejść w dev.

Mechanizm jest celowo defensywny:

- agenci nie dostają sekretów ani dostępu do produkcji,
- proposal nie może sam zatwierdzać produkcji,
- role `cto`, `privacy`, `security` i `cost` mają veto,
- produkcyjny deploy wymaga osobnej zgody ownera,
- walidator skanuje proposal/votes pod typowe wzorce sekretów.

Pliki procesu:

- `AGENTS.md` - wspólna instrukcja dla Claude, Codex, Qwen, Gemini i innych agentów,
- `docs/GOVERNANCE.md` - role, progi, statusy i veto,
- `docs/SECURITY_MODEL.md` - granice bezpieczeństwa i zakazane operacje,
- `docs/DEVELOPMENT_PROTOCOL.md` - jak dodawać narzędzia bez rozjechania architektury,
- `proposals/_TEMPLATE.md` - szablon wniosku,
- `votes/_TEMPLATE.json` - szablon głosowania.

Walidacja:

```bash
npm run np-civic -- status
npm run np-civic -- update-check
npm run np-civic -- proposal nazwa-pomyslu
npm run np-civic -- vote nazwa-pomyslu
npm run np-civic -- validate
node scripts/governance_check.mjs
node scripts/governance_check.mjs proposals/_TEMPLATE.md votes/_TEMPLATE.json
```

Opcjonalne powiadomienie w terminalu raz dziennie:

```bash
export NP_CIVIC_ROOT="/sciezka/do/narzedzia-obywatelskie"
. "$NP_CIVIC_ROOT/scripts/np_civic_hook.sh"
```

Hook tylko sprawdza wersję i wyświetla komunikat. Nie aktualizuje plików, nie deployuje i nie czyta sekretów.

## Deploy

Deploy produkcyjny Pages:

```bash
npx wrangler pages deploy --branch main
```

Deploy crona Kolejkomatu:

```bash
npx wrangler deploy
```

Po każdym deployu: `curl -I [URL]` + test funkcji krytycznej per `cloud_safety` B9. Sekrety:

- `GEMINI_API_KEY` - Pages Secrets dla Urzędomatu i Czytomatu.
- `MAILGUN_API_KEY` - Worker secret dla alertów Kolejkomatu, dopiero przed realną wysyłką alertów.

## Zasady produktu (twarde)

- Zero porad medycznych - tylko logistyka terminów. Disclaimer w stopce.
- Zero porad prawnych - Urzędomat/Czytomat tłumaczą treść i sugerują kroki, ale nie zastępują prawnika.
- Zero danych o zdrowiu - w Kolejkomacie zbieramy wyłącznie e-mail przy alercie, kasowany po wypisaniu.
- Zero-retention pism i treści - Urzędomat/Czytomat nie zapisują wejścia użytkownika ani pełnych wyników.
- Zawsze "dane wg NFZ, stan na [data], potwierdź telefonicznie" - nie obiecujemy zapisu, dajemy wiedzę.

## Testy

- `node scripts/test_e2e.mjs` - 14 checków (mapping, parser czasu, żywe API NFZ). Ostatni przebieg 19.07.2026: ALL PASS.
- UI zweryfikowane wizualnie (Playwright): `docs/screenshots/`.
- Przepływ Kolejkomatu: wyszukiwanie + alert POST -> D1 -> wypis tokenem.
- Przepływ Urzędomatu: syntetyczne pisma ZUS/US przez curl/UI.
- Przepływ Czytomatu: artykuł HTML + PDF Dziennika Ustaw przez Gemini.
