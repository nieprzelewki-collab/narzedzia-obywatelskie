// CZYTOMAT - wklej link (artykuł / ustawa / rozporządzenie / komunikat), dostajesz po ludzku.
// Czyta strony WWW (HTML) i PDF-y (Dziennik Ustaw, ISAP) - PDF idzie do Gemini natywnie.
// Zasady: zero retencji treści, w D1 tylko hash IP do limitu dziennego.
const JSON_H = { "Content-Type": "application/json; charset=utf-8" };
const LIMIT_DZIENNY = 10;
const MODEL = "gemini-flash-latest";
const MAX_HTML_CHARS = 60000;
const INLINE_PDF_BYTES = 6 * 1024 * 1024;   // mniejsze PDF-y inline (base64)
const MAX_PDF_BYTES = 50 * 1024 * 1024;     // większe przez Gemini Files API (upload -> analiza -> delete)

const SCHEMA = {
  type: "OBJECT",
  properties: {
    rodzaj_tresci: { type: "STRING" },
    tytul: { type: "STRING" },
    streszczenie: { type: "STRING" },
    najwazniejsze_punkty: { type: "ARRAY", items: { type: "STRING" } },
    co_to_znaczy_dla_ciebie: { type: "STRING" },
    daty_i_terminy: { type: "STRING" },
    slowniczek: { type: "ARRAY", items: { type: "OBJECT", properties: { termin: { type: "STRING" }, wyjasnienie: { type: "STRING" } }, required: ["termin", "wyjasnienie"] } },
    uwagi: { type: "STRING" },
  },
  required: ["rodzaj_tresci", "tytul", "streszczenie", "najwazniejsze_punkty", "co_to_znaczy_dla_ciebie", "daty_i_terminy", "slowniczek", "uwagi"],
};

const SYSTEM = `Jesteś Czytomatem - tłumaczem trudnych treści na prosty polski język. Dostajesz treść strony internetowej lub dokumentu PDF (artykuł, ustawa, rozporządzenie, komunikat urzędu, regulamin) i wyjaśniasz ją zwykłemu człowiekowi.

ZASADY:
1. Pisz PROSTO. Krótkie zdania. Zero żargonu - a jak musisz użyć terminu, wyjaśnij go w słowniczku.
2. rodzaj_tresci: np. "ustawa", "rozporządzenie", "artykuł prasowy", "komunikat urzędu", "regulamin", "inne".
3. streszczenie: 3-6 zdań - o czym to jest, dla każdego zrozumiałe.
4. najwazniejsze_punkty: 3-8 punktów - konkrety, nie ogólniki.
5. co_to_znaczy_dla_ciebie: 2-5 zdań z perspektywy zwykłego obywatela - co się dla niego zmienia, co go dotyczy, co powinien wiedzieć. Dla USTAW: kogo dotyczy i co konkretnie zmienia.
6. daty_i_terminy: kluczowe daty Z TREŚCI (wejście w życie, terminy, vacatio legis). Brak dat = "Treść nie podaje konkretnych dat".
7. slowniczek: 0-6 trudnych terminów z treści + proste wyjaśnienia.
8. uwagi: 0-2 zdania - np. że artykuł jest opinią a nie faktem, że to projekt ustawy a nie obowiązujące prawo, że treść wygląda na reklamę/clickbait.
9. NIGDY nie wymyślaj - opieraj się WYŁĄCZNIE na dostarczonej treści. Nie wiesz = napisz, że treść tego nie podaje.
10. To nie jest porada prawna - wyjaśniasz treść, nie doradzasz.`;

async function ipHash(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const dzien = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`czytomat|${ip}|${dzien}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function htmlNaTekst(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#\d+;|&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function b64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(bin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/analiza" && request.method === "POST") {
      try {
        return await analiza(request, env);
      } catch (e) {
        return new Response(JSON.stringify({ error: "Błąd analizy - spróbuj za chwilę." }), { status: 502, headers: JSON_H });
      }
    }
    return env.ASSETS.fetch(request);
  },
};

async function kasujPlik(env, nazwa) {
  if (!nazwa) return;
  try {
    await fetch(`https://generativelanguage.googleapis.com/v1beta/${nazwa}`, {
      method: "DELETE", headers: { "x-goog-api-key": env.GEMINI_API_KEY },
    });
  } catch {}
}

async function analiza(request, env) {
  const body = await request.json().catch(() => ({}));
  let link;
  try {
    link = new URL(String(body.url || "").trim());
    if (!["http:", "https:"].includes(link.protocol)) throw 0;
  } catch {
    return new Response(JSON.stringify({ error: "Wklej poprawny link (zaczynający się od http/https)." }), { status: 400, headers: JSON_H });
  }

  const hash = await ipHash(request);
  const dzien = new Date().toISOString().slice(0, 10);
  const row = await env.DB.prepare(
    `INSERT INTO uzycia_czytomat (ip_hash, dzien, licznik) VALUES (?, ?, 1)
     ON CONFLICT(ip_hash, dzien) DO UPDATE SET licznik = licznik + 1
     RETURNING licznik`
  ).bind(hash, dzien).first();
  if ((row?.licznik ?? 1) > LIMIT_DZIENNY) {
    return new Response(JSON.stringify({ error: `Limit ${LIMIT_DZIENNY} analiz dziennie wyczerpany - wróć jutro.` }), { status: 429, headers: JSON_H });
  }

  // pobierz treść (własny User-Agent - część serwerów blokuje domyślne)
  let strona;
  try {
    strona = await fetch(link.href, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Czytomat/0.1; +https://narzedzia-obywatelskie.pages.dev)", "Accept": "text/html,application/pdf,*/*" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Nie udało się pobrać tej strony. Sprawdź link." }), { status: 400, headers: JSON_H });
  }
  if (!strona.ok) {
    return new Response(JSON.stringify({ error: `Strona odpowiedziała błędem ${strona.status}. Sprawdź link (może wymaga logowania?).` }), { status: 400, headers: JSON_H });
  }

  const typ = (strona.headers.get("Content-Type") || "").toLowerCase();
  const czesci = [];
  let skrocone = false;

  let plikGemini = null; // files/... do skasowania po analizie
  if (typ.includes("pdf") || link.pathname.toLowerCase().endsWith(".pdf")) {
    const buf = await strona.arrayBuffer();
    if (buf.byteLength > MAX_PDF_BYTES) {
      return new Response(JSON.stringify({ error: "Ten PDF jest za duży (limit 50 MB). Spróbuj z krótszym dokumentem." }), { status: 400, headers: JSON_H });
    }
    if (buf.byteLength > INLINE_PDF_BYTES) {
      // duży PDF: Files API (raw upload), plik kasujemy zaraz po analizie
      const up = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
        method: "POST",
        headers: { "x-goog-api-key": env.GEMINI_API_KEY, "X-Goog-Upload-Protocol": "raw", "Content-Type": "application/pdf" },
        body: buf,
      });
      if (!up.ok) {
        console.log(`files upload fail ${up.status}`);
        return new Response(JSON.stringify({ error: "Nie udało się przetworzyć tego PDF-a - spróbuj za chwilę." }), { status: 502, headers: JSON_H });
      }
      const meta = (await up.json())?.file;
      plikGemini = meta?.name;
      // poczekaj aż plik będzie ACTIVE (duże PDF-y przetwarzają się chwilę)
      let stan = meta?.state;
      for (let i = 0; i < 15 && stan === "PROCESSING"; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const st = await fetch(`https://generativelanguage.googleapis.com/v1beta/${plikGemini}`, { headers: { "x-goog-api-key": env.GEMINI_API_KEY } });
        stan = (await st.json())?.state;
      }
      if (stan !== "ACTIVE") {
        await kasujPlik(env, plikGemini);
        return new Response(JSON.stringify({ error: "Nie udało się przetworzyć tego PDF-a." }), { status: 502, headers: JSON_H });
      }
      czesci.push({ file_data: { mime_type: "application/pdf", file_uri: meta.uri } });
    } else {
      czesci.push({ inline_data: { mime_type: "application/pdf", data: b64(buf) } });
    }
    czesci.push({ text: `Przeanalizuj powyższy dokument PDF (źródło: ${link.href}).` });
  } else {
    const html = await strona.text();
    let tekst = htmlNaTekst(html);
    if (tekst.length < 200) {
      return new Response(JSON.stringify({ error: "Na tej stronie nie znalazłem tekstu do analizy (może wymaga JavaScriptu albo logowania). Spróbuj skopiować treść i wkleić do Urzędomatu." }), { status: 400, headers: JSON_H });
    }
    if (tekst.length > MAX_HTML_CHARS) { tekst = tekst.slice(0, MAX_HTML_CHARS); skrocone = true; }
    czesci.push({ text: `Treść strony ${link.href}:\n\n${tekst}${skrocone ? "\n\n[UWAGA: treść została ucięta do limitu - zaznacz to w uwagach]" : ""}` });
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: czesci }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8000, response_mime_type: "application/json", response_schema: SCHEMA },
    }),
  });
  await kasujPlik(env, plikGemini); // zero-retention: plik znika niezależnie od wyniku
  if (!res.ok) {
    console.log(`gemini fail ${res.status}`);
    return new Response(JSON.stringify({ error: "Silnik analizy chwilowo niedostępny - spróbuj za minutę." }), { status: 502, headers: JSON_H });
  }
  const d = await res.json();
  const raw = d?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    return new Response(JSON.stringify({ error: "Nie udało się przeanalizować tej treści." }), { status: 502, headers: JSON_H });
  }
  let wynik;
  try { wynik = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ error: "Treść jest zbyt obszerna dla jednej analizy - spróbuj z krótszym dokumentem." }), { status: 502, headers: JSON_H });
  }
  wynik.zrodlo = link.href;
  wynik.pozostalo_dzis = Math.max(0, LIMIT_DZIENNY - (row?.licznik ?? 1));
  return new Response(JSON.stringify(wynik), { headers: JSON_H });
}
