// Kolejkomat - MVP. Cloudflare Worker: API + statyczny frontend + cron alertów.
// Zasady: zero danych medycznych (tylko specjalizacja + województwo + e-mail przy alercie),
// dane kolejek zawsze z dopiskiem "stan wg NFZ, potwierdź telefonicznie".
import { queues } from "./nfz.js";
import { suggest, WOJEWODZTWA } from "./mapping.js";
import { gslCategories, gslLink, gslRoute } from "./gsl.js";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Kanoniczny adres = Cloudflare Pages (kolejkomat.pages.dev); ten worker publicznie tylko przekierowuje.
    // Ruch API/frontend obsługuje Pages (_worker.js z tego samego kodu); tu zostaje cron alertów.
    if (env.REDIRECT_TO_PAGES === "1") {
      return Response.redirect(env.PUBLIC_URL + url.pathname + url.search, 301);
    }
    try {
      if (url.pathname === "/api/sugestie") return apiSugestie(url);
      if (url.pathname === "/api/kolejki") return apiKolejki(url, env);
      if (url.pathname === "/api/alert" && request.method === "POST") return apiAlertDodaj(request, env);
      if (url.pathname === "/api/alert/usun") return apiAlertUsun(url, env);
      if (url.pathname === "/api/wojewodztwa") return new Response(JSON.stringify(WOJEWODZTWA), { headers: JSON_HEADERS });
      if (url.pathname === "/api/gsl/kategorie") return apiGslKategorie();
      if (url.pathname === "/api/gsl/route") return apiGslRoute(url);
      if (url.pathname === "/api/gsl/link") return apiGslLink(url);
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 502, headers: JSON_HEADERS });
    }
    return env.ASSETS.fetch(request);
  },

  // Cron: raz dziennie sprawdź grupy alertów; dane NFZ zmieniają się ~miesięcznie,
  // więc realne powiadomienia pójdą rzadko - i o to chodzi (zero spamu).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(sprawdzAlerty(env));
  },
};

function apiSugestie(url) {
  const q = url.searchParams.get("q") ?? "";
  return new Response(JSON.stringify(suggest(q)), { headers: JSON_HEADERS });
}

function apiGslKategorie() {
  return new Response(JSON.stringify({ source: "NFZ GSL", categories: gslCategories() }), { headers: JSON_HEADERS });
}

function apiGslRoute(url) {
  const q = url.searchParams.get("q") ?? "";
  return new Response(JSON.stringify(gslRoute(q)), { headers: JSON_HEADERS });
}

function apiGslLink(url) {
  const id = url.searchParams.get("kategoria") ?? "";
  const category = gslLink(id);
  if (!category) {
    return new Response(JSON.stringify({ error: "Nieznana kategoria GSL" }), { status: 404, headers: JSON_HEADERS });
  }
  return new Response(JSON.stringify({ source: "NFZ GSL", category }), { headers: JSON_HEADERS });
}

async function apiKolejki(url, env) {
  const benefit = url.searchParams.get("benefit");
  const province = url.searchParams.get("woj");
  const caseType = url.searchParams.get("pilny") === "1" ? 2 : 1;
  if (!benefit || !WOJEWODZTWA[province]) {
    return new Response(JSON.stringify({ error: "Wymagane: benefit + woj (kod 01-16)" }), { status: 400, headers: JSON_HEADERS });
  }
  const data = await queues({ benefit, province, caseType });
  return new Response(JSON.stringify(data), { headers: JSON_HEADERS });
}

async function apiAlertDodaj(request, env) {
  const body = await request.json().catch(() => ({}));
  const { email, benefit, woj } = body;
  const caseType = body.pilny ? 2 : 1;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !benefit || !WOJEWODZTWA[woj]) {
    return new Response(JSON.stringify({ error: "Wymagane: poprawny email, benefit, woj" }), { status: 400, headers: JSON_HEADERS });
  }
  const token = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO alerty (email, benefit, province, case_type, token) VALUES (?, ?, ?, ?, ?)"
  ).bind(email, benefit, woj, caseType, token).run();
  return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
}

async function apiAlertUsun(url, env) {
  const token = url.searchParams.get("t");
  if (!token) return new Response("Brak tokenu", { status: 400 });
  await env.DB.prepare("DELETE FROM alerty WHERE token = ?").bind(token).run();
  return new Response("Alert usunięty. Dziękujemy za skorzystanie z Kolejkomatu.", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

// --- Silnik alertów ---

const PROG_POPRAWY_DNI = 14; // wysyłamy tylko gdy najlepszy termin skrócił się o >= 14 dni

async function sprawdzAlerty(env) {
  const grupy = await env.DB.prepare(
    "SELECT DISTINCT benefit, province, case_type FROM alerty"
  ).all();
  for (const g of grupy.results ?? []) {
    try {
      // Sekwencyjnie, nie równolegle - rate limit NFZ (429).
      const { results } = await queues({ benefit: g.benefit, province: g.province, caseType: g.case_type, maxPages: 1 });
      const best = results.find((r) => r.waitLabel !== null);
      if (!best) continue;
      const bestDays = parseWaitDays(best.waitLabel);
      const snap = await env.DB.prepare(
        "SELECT best_days FROM snapshoty WHERE benefit=? AND province=? AND case_type=?"
      ).bind(g.benefit, g.province, g.case_type).first();

      if (snap && bestDays !== null && snap.best_days - bestDays >= PROG_POPRAWY_DNI) {
        await powiadomGrupe(env, g, best);
      }
      await env.DB.prepare(
        `INSERT INTO snapshoty (benefit, province, case_type, best_days, best_label, best_provider, checked_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(benefit, province, case_type) DO UPDATE SET
           best_days=excluded.best_days, best_label=excluded.best_label,
           best_provider=excluded.best_provider, checked_at=excluded.checked_at`
      ).bind(g.benefit, g.province, g.case_type, bestDays, best.waitLabel, best.provider).run();
      await new Promise((r) => setTimeout(r, 2500));
    } catch (e) {
      console.log(`alert-check fail ${g.benefit}/${g.province}: ${e.message}`);
    }
  }
}

// "0 dni" / "3 tygodnie" / "2 miesiące" -> dni (null gdy nieparsowalne)
export function parseWaitDays(label) {
  const m = String(label).match(/(\d+)\s*(dni|dzień|tydz|tygod|mies|rok|lat)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith("dni") || unit.startsWith("dzie")) return n;
  if (unit.startsWith("tydz") || unit.startsWith("tygod")) return n * 7;
  if (unit.startsWith("mies")) return n * 30;
  return n * 365;
}

async function powiadomGrupe(env, grupa, best) {
  const subs = await env.DB.prepare(
    "SELECT email, token FROM alerty WHERE benefit=? AND province=? AND case_type=?"
  ).bind(grupa.benefit, grupa.province, grupa.case_type).all();
  for (const s of subs.results ?? []) {
    const text = [
      `Dzień dobry,`,
      ``,
      `Kolejkomat wykrył krótszy termin NFZ dla: ${grupa.benefit} (woj. ${WOJEWODZTWA[grupa.province]}).`,
      ``,
      `Najkrótsze oczekiwanie teraz: ${best.waitLabel}`,
      `Placówka: ${best.provider}`,
      `Adres: ${best.address}, ${best.locality}`,
      `Telefon do rejestracji: ${best.phone}`,
      ``,
      `Dane wg Informatora NFZ (stan na ${best.dataAsAt}). Przed wizytą potwierdź termin telefonicznie.`,
      ``,
      `Pozdrawiam,`,
      `Kolejkomat`,
      ``,
      `Wypisz się: ${env.PUBLIC_URL}/api/alert/usun?t=${s.token}`,
    ].join("\n");
    await wyslijMail(env, s.email, `Krótszy termin: ${grupa.benefit} (${WOJEWODZTWA[grupa.province]})`, text);
  }
}

async function wyslijMail(env, to, subject, text) {
  if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) {
    console.log(`MAIL (dry-run, brak konfiguracji): ${to} | ${subject}`);
    return;
  }
  const form = new FormData();
  form.set("from", env.MAIL_FROM);
  form.set("to", to);
  form.set("subject", subject);
  form.set("text", text);
  const res = await fetch(`https://api.eu.mailgun.net/v3/${env.MAILGUN_DOMAIN}/messages`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa("api:" + env.MAILGUN_API_KEY) },
    body: form,
  });
  if (!res.ok) console.log(`mailgun fail ${res.status} dla ${to}`);
}
