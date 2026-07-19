# CHANGELOG - Narzędzia Obywatelskie

## [2026-07-19] Skill współpracy i governance gate

- Dodany lokalny skill `skills/np-civic-tools/SKILL.md` dla rozwoju Narzędzi Obywatelskich przez proposal -> głosowanie -> dev -> testy -> osobny gate produkcyjny.
- Dodane dokumenty procesu: `docs/GOVERNANCE.md`, `docs/SECURITY_MODEL.md`, `docs/DEVELOPMENT_PROTOCOL.md`, `proposals/_TEMPLATE.md`, `votes/_TEMPLATE.json`.
- Dodany walidator `scripts/governance_check.mjs`: sprawdza wymagane sekcje, komplet ról, veto, zakaz auto-prod i typowe wzorce sekretów.
- Dodany CLI `np-civic` (`scripts/np_civic.mjs`) z komendami `status`, `update-check`, `proposal`, `vote`, `validate` oraz opcjonalny terminal hook `scripts/np_civic_hook.sh` w trybie notify-only.
- Dodane przygotowanie pod publiczne repo: `package.json`, `VERSION`, `.np-civic.json`, GitHub Actions CI i template Pull Request.
- Dodany `.gitignore` blokujący lokalne env, klucze, credentials, `.wrangler/`, `node_modules/` i sourcemapy z `dist/`.

## [2026-07-19] Redesign parasola w stylu protocol board

- `narzedzia-obywatelskie.pages.dev` przebudowany z prostych kart na układ inspirowany referencjami Piotra: czarne tło, stalowy panel boczny, lime accent, numerowane plansze i typografia `Anton` + `Space Mono`.
- Dodany wygenerowany asset fotograficzny `parasol/dist/img/civic-protocol-hero.png`: trzy ludzkie sceny bez twarzy dla Kolejkomatu, Urzędomatu i Czytomatu.
- Layout zweryfikowany lokalnie screenshotami Chrome headless: desktop 1440x900 i mobile 390x844; poprawiona mobilna szerokość copy, żeby tekst nie wyglądał na ucięty.
- Korekta po feedbacku Piotra: headline i panel boczny po polsku, jaśniejsze zdjęcie główne, kompaktowy wariant dla 13-calowego laptopa 1280x800 oraz dopracowany mobile 390x844.

## [2026-07-19] Domknięcie parasola Narzędzia Obywatelskie

- Parasol `narzedzia-obywatelskie.pages.dev` uproszczony do statycznego landing page rodziny 01-03.
- Usunięto martwe endpointy waitlisty Urzędomatu z `parasol/dist/_worker.js` i zdjęto zbędne bindowanie D1 z `parasol/wrangler.toml`.
- README zaktualizowane z historycznego stanu "NIE zdeployowany" do realnego stanu produkcji: Kolejkomat, Urzędomat, Czytomat + parasol live.
- Powód: mniejsza powierzchnia uprawnień i brak driftu między dokumentacją, UI i produkcją.

## [2026-07-19] Pierwszy deploy PROD (za zgodą Piotra)

- **URL:** https://kolejkomat.nieprzelewki.workers.dev (Worker `kolejkomat`, konto CF nieprzelewki)
- **D1:** `kolejkomat-db` id `7a72dd65-38d2-41d4-a1d5-e77b72f5b01d` (region EEUR), schema załadowana (`alerty`, `snapshoty`)
- **Cron:** `0 6 * * *` (silnik alertów, sekwencyjny z backoffem na rate-limit NFZ)
- **Wersja:** cf0c92e5 (druga wersja tego dnia - pierwsza cc929f54 miała placeholder PUBLIC_URL)
- **Weryfikacja per cloud_safety B9:** `curl -I` = HTTP 200 text/html; `/api/sugestie` OK; `/api/kolejki` przez prod = 136 placówek okulistyka/łódzkie; alert POST->D1->wypis tokenem = OK (baza po teście pusta)
- **Mailgun NIE skonfigurowany** (MAILGUN_DOMAIN pusty) -> wysyłka alertów = dry-run do logów. Do zrobienia przed realnym użyciem alertów: `wrangler secret put MAILGUN_API_KEY` + MAILGUN_DOMAIN/MAIL_FROM w [vars]
- Rollback: `npx wrangler rollback` (poprzednia wersja) lub `npx wrangler delete` (pełne zdjęcie); D1 usuwalna osobno
- Zbudowane i przetestowane wcześniej tego dnia (testy 14/14 + weryfikacja wizualna desktop/mobile) - szczegóły README.md

## [2026-07-19] Migracja adresu: kolejkomat.pages.dev (bez "nieprzelewki")

- **Kanoniczny URL:** https://kolejkomat.pages.dev (Cloudflare Pages, projekt `kolejkomat`)
- Architektura: Pages `_worker.js` (esbuild bundle z worker/src/index.js) + statyki = frontend+API; worker `kolejkomat` zostaje TYLKO jako cron alertów (Pages nie ma cronów) + 301 redirect workers.dev -> pages.dev (flaga REDIRECT_TO_PAGES)
- Wspólna D1 `kolejkomat-db` (bind w obu)
- Decyzja Piotra: adres BEZ "nfz" w nazwie (rekomendacja - ryzyko sugerowania oficjalnego serwisu Funduszu) i bez "nieprzelewki" (izolacja venture)
- Weryfikacja: curl -I 200 na pages.dev, sugestie+kolejki (136) OK, alert POST->D1->wypis OK, redirect 301 z workers.dev OK
- Pułapka wdrożeniowa: `wrangler pages deploy` bierze branch gita jako branch deploymentu -> preview zamiast produkcji; deploy produkcyjny = `--branch main`
- Build powtarzalny: komentarz w pages/wrangler.toml

## [2026-07-19] Marka-parasol: NARZĘDZIA OBYWATELSKIE (decyzja Piotra)

- **https://narzedzia-obywatelskie.pages.dev** - landing rodziny narzędzi (Pages `narzedzia-obywatelskie`, źródło: `parasol/`)
- Układ: 01 KOLEJKOMAT [DZIAŁA] -> link do kolejkomat.pages.dev; 02 URZĘDOMAT [WKRÓTCE] -> waitlista e-mail
- Waitlista: tabela `waitlista` we wspólnej D1 (dedupe email+narzędzie, wypis tokenem `/api/waitlista/usun?t=`); liczba zapisów = trigger budowy Urzędomatu
- Kolejkomat: link zwrotny do rodziny w panelu bocznym (redeploy Pages)
- Weryfikacja: curl 200 (po ~1 min propagacji nowej subdomeny - najpierw 522, cierpliwość), waitlista POST->D1->wypis OK, wizualnie desktop+mobile OK (docs/screenshots/parasol_*)

## [2026-07-19] URZĘDOMAT zbudowany i LIVE (decyzja Piotra: "od A do Z, ma dziś działać")

- **https://urzedomat.pages.dev** (Pages `urzedomat`, źródło: `urzedomat/`) - pismo z urzędu na ludzki język
- Silnik: **Gemini `gemini-flash-latest`** przez REST z wymuszonym JSON schema (response_schema) - grosze/analizę. UWAGA: plan zakładał Claude Haiku, ale `ANTHROPIC_API_KEY` nie istnieje w kanonicznym `.env` (są tylko GEMINI/OPENAI itd.) - pivot na Gemini bez tworzenia nowych kluczy. Sekret `GEMINI_API_KEY` w CF Pages Secrets (pipe z .env, wartość nigdzie nie wypisana)
- Output: czy_pismo_urzedowe / rodzaj / nadawca / co_to_znaczy / kroki / do_kiedy / konsekwencje / szkic_odpowiedzi (kopiuj 1 klik) / uwagi
- **Zero-retention:** treść pisma NIE jest logowana ani zapisywana; w D1 tylko SHA-256(ip+dzień) do limitu **10 analiz/dzień/IP** (tabela `uzycia_urzedomat`, wspólna D1)
- Twarde zasady: "to nie porada prawna" + wskazanie darmowej pomocy prawnej; zakaz wymyślania danych w promptcie
- E2E PASS na syntetycznych pismach (wezwanie ZUS przez curl + upomnienie US przez UI); weryfikacja wizualna desktop+mobile (docs/screenshots/urzedomat_*)
- Debug-lekcja: pierwotny 502 = brak tabeli `uzycia_urzedomat` (wcześniejszy łańcuch komend przerwany na grep exit 1 - tabela nie weszła do schema.sql); fix + weryfikacja listy tabel
- Rodzina zaktualizowana: parasol - karta 02 [DZIAŁA] + link (waitlista usunięta, niepotrzebna), Kolejkomat - link "działa też: Urzędomat"

## [2026-07-19] Fix pokrycia wyszukiwarki (zgłoszenie Piotra: "kardiolog, dentysta nie działają")

- **Audyt pokrycia:** test `pokrycie 38 potocznych zapytań` w test_e2e.mjs - każde musi zwrócić wynik albo notę (regresja niemożliwa po cichu)
- **Mapa synonimów rozszerzona ~3x** (wszystkie nazwy zweryfikowane w słowniku): dentysta/stomatolog, ortodonta, protetyk, ginekolog/położnik, psycholog (fix: →PORADNIA PSYCHOLOGICZNA, psychiatra →PZP), logopeda, rehabilitacja/fizjoterapia, geriatra, hematolog, neurochirurg, kardiochirurg, proktolog, hepatolog, chirurg, dietetyk, genetyk, audiolog, foniatra, neonatolog, leczenie bólu, uzależnienia, medycyna sportowa, wady postawy + potoczne (zęby, ciąża, żylaki, hemoroidy, słuch, depresja...)
- **Kardiolog:** zamiast pustej noty - pokazujemy szpitalne ODDZIAŁY KARDIOLOGICZNE + notę nad wynikami. Zweryfikowane u źródła (pacjent.gov.pl/politykazdrowotna): od 01.07.2026 poradnie kardiologiczne przeszły do centralnej e-rejestracji (AP-KOLCE wygaszone) - dlatego nie ma ich w Informatorze; kierujemy na pacjent.gov.pl / mojeIKP / 800 190 590
- Frontend: nota wyświetlana NAD wynikami (nie tylko przy pustych)
- Prod zweryfikowany: dentysta/łódzkie = 368 poradni, kardiolog/mazowieckie = 36 oddziałów + nota

## [2026-07-19] CZYTOMAT (narzędzie 03) LIVE + spięcie rodziny wspólną nawigacją

- **https://czytomat.pages.dev** (Pages `czytomat`, źródło `czytomat/`) - wklejasz LINK (artykuł/ustawa/rozporządzenie/komunikat), dostajesz: rodzaj+tytuł / streszczenie / najważniejsze punkty / co to znaczy dla Ciebie / daty i terminy / słowniczek / uwagi
- **Czyta HTML i PDF:** strony WWW (strip HTML, limit 60k znaków z flagą ucięcia) + **PDF natywnie przez Gemini inline_data** (limit 8 MB) - działa z Dziennikiem Ustaw/ISAP. E2E PASS: artykuł pacjent.gov.pl (komunikat urzędu, 7 punktów, słowniczek 5) + PDF D2026000000101 (ustawa Prawo atomowe, tekst jednolity)
- Ten sam wzorzec co Urzędomat: Gemini flash-latest + JSON schema, zero-retention (ani linki, ani treści), limit 10/dzień/IP (tabela `uzycia_czytomat`), disclaimer
- **Debug-lekcja:** 502 na dużych artykułach = odpowiedź Gemini ucięta na maxOutputTokens 4000 w połowie JSON → 8000 + łagodny komunikat przy nieparsowalnym JSON (fix także w Urzędomacie)
- **Rodzina spięta:** wspólny pasek nawigacji (NARZĘDZIA OBYWATELSKIE / 01 / 02 / 03) na Kolejkomacie, Urzędomacie i Czytomacie; parasol ma kartę 03 + spis 3/3 [DZIAŁA]; spis narzędzi w panelach bocznych 01↔02↔03
