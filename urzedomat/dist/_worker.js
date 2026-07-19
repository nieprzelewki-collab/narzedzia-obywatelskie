// URZĘDOMAT - pismo z urzędu na ludzki język.
// Zasady twarde: ZERO retencji treści pism (nie logujemy, nie zapisujemy),
// w D1 tylko hash IP do limitu dziennego. To informacja, nie porada prawna.
const JSON_H = { "Content-Type": "application/json; charset=utf-8" };
const LIMIT_DZIENNY = 10;
const MODEL = "gemini-flash-latest";

const SCHEMA = {
  type: "OBJECT",
  properties: {
    czy_pismo_urzedowe: { type: "BOOLEAN" },
    rodzaj_pisma: { type: "STRING" },
    nadawca: { type: "STRING" },
    co_to_znaczy: { type: "STRING" },
    co_musisz_zrobic: { type: "ARRAY", items: { type: "STRING" } },
    do_kiedy: { type: "STRING" },
    konsekwencje_bezczynnosci: { type: "STRING" },
    szkic_odpowiedzi: { type: "STRING" },
    uwagi: { type: "STRING" },
  },
  required: ["czy_pismo_urzedowe", "rodzaj_pisma", "nadawca", "co_to_znaczy", "co_musisz_zrobic", "do_kiedy", "konsekwencje_bezczynnosci", "szkic_odpowiedzi", "uwagi"],
};

const SYSTEM = `Jesteś Urzędomatem - tłumaczem pism urzędowych na prosty polski język. Dostajesz treść pisma (z ZUS, urzędu skarbowego, sądu, gminy, komornika, banku itp.) i wyjaśniasz je zwykłemu człowiekowi.

ZASADY:
1. Pisz PROSTO - tak, żeby zrozumiał każdy dorosły bez wykształcenia prawniczego. Krótkie zdania. Zero żargonu, a jak musisz użyć terminu - wyjaśnij go w nawiasie.
2. czy_pismo_urzedowe: false, jeśli tekst NIE wygląda na pismo urzędowe/oficjalne - wtedy w co_to_znaczy napisz krótko dlaczego, a pozostałe pola wypełnij "-".
3. co_to_znaczy: 2-4 zdania - co ten dokument oznacza dla odbiorcy.
4. co_musisz_zrobic: konkretna lista kroków (2-5 punktów). Jeśli pismo nie wymaga działania - jeden punkt "Nie musisz nic robić" z wyjaśnieniem.
5. do_kiedy: termin Z PISMA (przepisz datę lub sposób liczenia, np. "14 dni od doręczenia"). Jeśli pisma nie ma terminu - napisz "Pismo nie podaje terminu".
6. konsekwencje_bezczynnosci: co się stanie, jeśli odbiorca nic nie zrobi - na podstawie treści pisma, bez straszenia.
7. szkic_odpowiedzi: gotowy do skopiowania szkic odpowiedzi/odwołania po polsku, rzeczowy i grzeczny, z miejscami do uzupełnienia w nawiasach kwadratowych, np. [IMIĘ I NAZWISKO], [NUMER SPRAWY], [DATA]. Jeśli odpowiedź nie jest potrzebna - napisz "Odpowiedź nie jest potrzebna" i jedno zdanie dlaczego.
8. uwagi: 0-2 zdania - np. że warto skonsultować z prawnikiem przy dużej kwocie, albo że pismo wygląda na wezwanie-scam (jeśli tak wygląda - napisz to wprost).
9. NIGDY nie wymyślaj danych, kwot, dat ani sygnatur, których nie ma w piśmie. Nie wiesz = napisz, że pismo tego nie podaje.
10. To NIE jest porada prawna - nie pisz opinii o szansach w sądzie, trzymaj się treści pisma.`;

async function ipHash(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const dzien = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`urzedomat|${ip}|${dzien}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
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

async function analiza(request, env) {
  const body = await request.json().catch(() => ({}));
  const tekst = String(body.tekst || "").trim();
  if (tekst.length < 80) {
    return new Response(JSON.stringify({ error: "Wklej pełną treść pisma (co najmniej kilka zdań)." }), { status: 400, headers: JSON_H });
  }
  if (tekst.length > 15000) {
    return new Response(JSON.stringify({ error: "Pismo jest za długie (limit 15 000 znaków). Wklej najważniejszą część." }), { status: 400, headers: JSON_H });
  }

  // limit dzienny per IP (w bazie wyłącznie hash - IP nie da się odtworzyć)
  const hash = await ipHash(request);
  const dzien = new Date().toISOString().slice(0, 10);
  const row = await env.DB.prepare(
    `INSERT INTO uzycia_urzedomat (ip_hash, dzien, licznik) VALUES (?, ?, 1)
     ON CONFLICT(ip_hash, dzien) DO UPDATE SET licznik = licznik + 1
     RETURNING licznik`
  ).bind(hash, dzien).first();
  if ((row?.licznik ?? 1) > LIMIT_DZIENNY) {
    return new Response(JSON.stringify({ error: `Limit ${LIMIT_DZIENNY} analiz dziennie wyczerpany - wróć jutro. (Narzędzie jest darmowe, a każda analiza kosztuje - limit chroni projekt.)` }), { status: 429, headers: JSON_H });
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: `Treść pisma:\n\n${tekst}` }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8000,
        response_mime_type: "application/json",
        response_schema: SCHEMA,
      },
    }),
  });
  if (!res.ok) {
    // celowo NIE logujemy treści pisma ani odpowiedzi - tylko status
    console.log(`gemini fail ${res.status}`);
    return new Response(JSON.stringify({ error: "Silnik analizy chwilowo niedostępny - spróbuj za minutę." }), { status: 502, headers: JSON_H });
  }
  const d = await res.json();
  const raw = d?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    return new Response(JSON.stringify({ error: "Nie udało się przeanalizować tego tekstu." }), { status: 502, headers: JSON_H });
  }
  let wynik;
  try { wynik = JSON.parse(raw); } catch {
    return new Response(JSON.stringify({ error: "Treść jest zbyt obszerna dla jednej analizy - spróbuj z krótszym dokumentem." }), { status: 502, headers: JSON_H });
  }
  wynik.pozostalo_dzis = Math.max(0, LIMIT_DZIENNY - (row?.licznik ?? 1));
  return new Response(JSON.stringify(wynik), { headers: JSON_H });
}
