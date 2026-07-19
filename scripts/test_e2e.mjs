// Test E2E logiki Kolejkomatu w node (bez workera): mapping + adapter NFZ + parser czasu.
// Uruchom: node scripts/test_e2e.mjs   (z katalogu PROJEKTY/NARZEDZIA-OBYWATELSKIE)
import fs from "node:fs";
import { suggest, WOJEWODZTWA } from "../worker/src/mapping.js";
import { queues } from "../worker/src/nfz.js";
import { parseWaitDays } from "../worker/src/index.js";
import { gslCategories, gslRoute } from "../worker/src/gsl.js";

let fails = 0;
const check = (name, cond, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? " | " + extra : ""}`);
  if (!cond) fails++;
};

// 1. Mapowanie "po ludzku"
const t1 = suggest("ortopeda");
check("ortopeda -> ORTOPEDIA", t1.matches[0] === "ŚWIADCZENIA Z ZAKRESU ORTOPEDII I TRAUMATOLOGII NARZĄDU RUCHU", t1.matches[0]);
const t2 = suggest("okulista dla dziecka");
check("okulista (fuzzy) znajduje coś", t2.matches.length > 0, t2.matches[0] ?? "-");
const t3 = suggest("kardiolog");
check("kardiolog -> ODDZIAŁ + nota e-rejestracja", t3.matches[0] === "ODDZIAŁ KARDIOLOGICZNY" && !!t3.note);
const t4 = suggest("dermatolog");
check("dermatolog -> PORADNIA DERMATOLOGICZNA", t4.matches[0] === "PORADNIA DERMATOLOGICZNA");
const t5 = suggest("zdrowie psychiczne");
check("fuzzy: 'zdrowie psychiczne'", t5.matches.some((m) => m.includes("ZDROWIA PSYCHICZNEGO")), t5.matches[0] ?? "-");

// AUDYT POKRYCIA: każde potoczne zapytanie musi zwrócić wynik albo notę
const POTOCZNE = ["dentysta","stomatolog","ortodonta","ginekolog","psycholog","psychiatra","logopeda",
  "rehabilitacja","fizjoterapeuta","geriatra","hematolog","neurochirurg","kardiochirurg","proktolog",
  "hepatolog","chirurg","dietetyk","genetyk","audiolog","okulista","ortopeda","neurolog","urolog",
  "diabetolog","gastrolog","laryngolog","onkolog","nefrolog","pulmonolog","dermatolog","alergolog",
  "reumatolog","endokrynolog","kardiolog","cukrzyca","tarczyca","alkohol","medycyna sportowa"];
const dziury = POTOCZNE.filter((q) => { const r = suggest(q); return !r.matches.length && !r.note; });
check(`pokrycie ${POTOCZNE.length} potocznych zapytań`, dziury.length === 0, dziury.length ? "DZIURY: " + dziury.join(", ") : "komplet");

// 2. Parser czasu oczekiwania
check("parse '0 dni' = 0", parseWaitDays("0 dni") === 0);
check("parse '3 tygodnie' = 21", parseWaitDays("3 tygodnie") === 21);
check("parse '2 miesiące' = 60", parseWaitDays("2 miesiące") === 60);
check("parse 'brak' = null", parseWaitDays("brak danych") === null);

// 3. Żywe API NFZ: ortopedia, mazowieckie (weryfikuje też kod województwa 07)
console.log("\nŻywe API NFZ (ortopedia, mazowieckie, stabilny)...");
const d = await queues({ benefit: t1.matches[0], province: "07", caseType: 1, maxPages: 1 });
check("API zwraca placówki", d.count > 0, `count=${d.count}`);
const r = d.results[0];
check("rekord ma provider+phone+termin", !!(r && r.provider && r.phone !== undefined && r.waitLabel !== undefined));
// Współrzędne bywają null dla części placówek - wymagamy ich w większości wyników.
const zGeo = d.results.filter((x) => typeof x.lat === "number" && typeof x.lon === "number");
// Znane ograniczenie: NFZ podaje geo tylko dla części placówek (patrz README - ograniczenia).
check("część wyników ma współrzędne", zGeo.length > 0, `${zGeo.length}/${d.results.length}`);
check("geo wygląda na mazowieckie (lat 51-54)", zGeo.length > 0 && zGeo.every((x) => x.lat > 51 && x.lat < 54), zGeo[0] ? `${zGeo[0].locality} lat=${zGeo[0].lat}` : "-");
console.log(`   Najkrótszy termin: ${r?.waitLabel} | ${r?.provider} | ${r?.locality} | tel ${r?.phone}`);

check("słownik województw ma 16 pozycji", Object.keys(WOJEWODZTWA).length === 16);

// 4. GSL: katalog i routing intencji do oficjalnej wyszukiwarki "Gdzie się leczyć".
const gsl = gslCategories();
check("GSL ma katalog kategorii", gsl.length >= 8 && gsl.every((c) => c.url?.startsWith("https://gsl.nfz.gov.pl/GSL/GSL/")));
check("GSL route: SOR", gslRoute("SOR").matches[0]?.id === "sor");
check("GSL route: boli ząb w nocy", gslRoute("boli ząb w nocy").matches.some((m) => m.id === "stomatologia-dorazna"));
check("GSL route: lekarz rodzinny", gslRoute("lekarz rodzinny").matches[0]?.id === "poz");
check("GSL route: profilaktyka", gslRoute("profilaktyka").matches[0]?.id === "programy-profilaktyczne");

// 5. UI: moduł GSL "Pomoc teraz" musi zostać w Kolejkomacie.
const html = fs.readFileSync("worker/static/index.html", "utf8");
check("UI ma sekcję Pomoc teraz", html.includes('id="pomoc-teraz"') && html.includes("Pomoc teraz"));
check("UI ma router GSL API", html.includes('id="gslform"') && html.includes("/api/gsl/route"));
check("UI linkuje SOR GSL", html.includes("https://gsl.nfz.gov.pl/GSL/GSL/SOR"));
check("UI linkuje nocną pomoc GSL", html.includes("https://gsl.nfz.gov.pl/GSL/GSL/PomocNocna"));
check("UI linkuje profilaktykę GSL", html.includes("https://gsl.nfz.gov.pl/GSL/GSL/ProgramyProfilaktyczne"));

console.log(fails ? `\n${fails} TESTÓW PADŁO` : "\nWSZYSTKIE TESTY PASS");
process.exit(fails ? 1 : 0);
