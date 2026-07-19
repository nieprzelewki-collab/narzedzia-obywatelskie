// Adapter API NFZ "Informator o Terminach Leczenia" v1.4
// Docs: https://apinfz.nfz.gov.pl/app-itl-api-pcus/
// UWAGA: API ma agresywny rate-limit (429) - zawsze backoff, nigdy równoległe salwy.

const BASE = "https://apinfz.nfz.gov.pl/app-itl-api-pcus";
const UA = "Kolejkomat/0.1 (kontakt w stopce serwisu)";

async function fetchJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 + i * 3000));
      continue;
    }
    if (!res.ok) throw new Error(`NFZ API ${res.status}: ${url}`);
    return res.json();
  }
  throw new Error(`NFZ API 429 po ${tries} próbach: ${url}`);
}

// Kolejki: pierwsze wolne terminy dla świadczenia w województwie.
// caseType: 1 = przypadek stabilny, 2 = przypadek pilny
// API zwraca wyniki posortowane wg pierwszego dostępnego terminu.
export async function queues({ benefit, province, caseType = 1, maxPages = 2 }) {
  const out = [];
  let page = 1;
  let count = 0;
  while (page <= maxPages) {
    const qs = new URLSearchParams({
      page: String(page),
      limit: "25",
      format: "json",
      case: String(caseType),
      province,
      benefit,
    });
    const d = await fetchJson(`${BASE}/queues?${qs}`);
    count = d.meta?.count ?? 0;
    for (const q of d.data ?? []) out.push(normalize(q));
    if (out.length >= count || !(d.data ?? []).length) break;
    page++;
  }
  return { count, results: out };
}

function normalize(q) {
  const a = q.attributes ?? {};
  const stats = a.statistics?.["provider-data"] ?? {};
  return {
    id: q.id,
    benefit: a.benefit,
    provider: a.provider,
    place: a.place,
    address: a.address,
    locality: a.locality,
    phone: a.phone,
    lat: a.latitude,
    lon: a.longitude,
    forChildren: a["benefits-for-children"] === "Y",
    // "pcus" = prognozowany czas oczekiwania wg NFZ (np. "0 dni", "3 miesiące")
    waitLabel: a.dates?.pcus ?? null,
    dataAsAt: a.dates?.["date-situation-as-at"] ?? null,
    awaiting: stats.awaiting ?? null,
    averagePeriodDays: stats["average-period"] ?? null,
    statsMonth: stats.update ?? null,
  };
}

// Słownik świadczeń online (wymaga name >= 3 znaki) - używany tylko jako fallback,
// podstawą jest lokalny snapshot data/benefits.json.
export async function benefitsSearch(name) {
  const qs = new URLSearchParams({ name, limit: "25", format: "json", page: "1" });
  const d = await fetchJson(`${BASE}/benefits?${qs}`);
  return d.data ?? [];
}
