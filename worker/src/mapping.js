// Mapowanie "po ludzku" -> nomenklatura NFZ.
// Warstwa 1: twarda mapa synonimów (zweryfikowana 19.07.2026 na żywym słowniku API).
// Warstwa 2: fuzzy match po pełnym słowniku (data/benefits.json, 562 pozycje).
import BENEFITS from "../data/benefits.json" with { type: "json" };

// Nazwy zweryfikowane w słowniku NFZ (19.07.2026) - nie zgadywane.
const SYNONIMY = {
  // AOS "ŚWIADCZENIA Z ZAKRESU ..."
  endokrynolog: ["ŚWIADCZENIA Z ZAKRESU ENDOKRYNOLOGII"],
  tarczyca: ["ŚWIADCZENIA Z ZAKRESU ENDOKRYNOLOGII"],
  okulista: ["ŚWIADCZENIA Z ZAKRESU OKULISTYKI"],
  oczy: ["ŚWIADCZENIA Z ZAKRESU OKULISTYKI"],
  wzrok: ["ŚWIADCZENIA Z ZAKRESU OKULISTYKI"],
  neurolog: ["ŚWIADCZENIA Z ZAKRESU NEUROLOGII"],
  ortopeda: ["ŚWIADCZENIA Z ZAKRESU ORTOPEDII I TRAUMATOLOGII NARZĄDU RUCHU"],
  kolano: ["ŚWIADCZENIA Z ZAKRESU ORTOPEDII I TRAUMATOLOGII NARZĄDU RUCHU"],
  kregoslup: ["ŚWIADCZENIA Z ZAKRESU ORTOPEDII I TRAUMATOLOGII NARZĄDU RUCHU"],
  urolog: ["ŚWIADCZENIA Z ZAKRESU UROLOGII"],
  prostata: ["ŚWIADCZENIA Z ZAKRESU UROLOGII"],
  diabetolog: ["ŚWIADCZENIA Z ZAKRESU DIABETOLOGII"],
  cukrzyca: ["ŚWIADCZENIA Z ZAKRESU DIABETOLOGII"],
  gastrolog: ["ŚWIADCZENIA Z ZAKRESU GASTROENTEROLOGII"],
  gastroenterolog: ["ŚWIADCZENIA Z ZAKRESU GASTROENTEROLOGII"],
  zoladek: ["ŚWIADCZENIA Z ZAKRESU GASTROENTEROLOGII"],
  jelita: ["ŚWIADCZENIA Z ZAKRESU GASTROENTEROLOGII"],
  laryngolog: ["ŚWIADCZENIA Z ZAKRESU OTOLARYNGOLOGII"],
  otolaryngolog: ["ŚWIADCZENIA Z ZAKRESU OTOLARYNGOLOGII"],
  uszy: ["ŚWIADCZENIA Z ZAKRESU OTOLARYNGOLOGII"],
  zatoki: ["ŚWIADCZENIA Z ZAKRESU OTOLARYNGOLOGII"],
  onkolog: ["ŚWIADCZENIA Z ZAKRESU ONKOLOGII"],
  nefrolog: ["ŚWIADCZENIA Z ZAKRESU NEFROLOGII"],
  nerki: ["ŚWIADCZENIA Z ZAKRESU NEFROLOGII"],
  pulmonolog: ["ŚWIADCZENIA Z ZAKRESU GRUŹLICY I CHORÓB PŁUC"],
  pluca: ["ŚWIADCZENIA Z ZAKRESU GRUŹLICY I CHORÓB PŁUC"],
  // PORADNIE
  dentysta: ["PORADNIA STOMATOLOGICZNA", "PORADNIA STOMATOLOGICZNA DLA DZIECI"],
  stomatolog: ["PORADNIA STOMATOLOGICZNA", "PORADNIA STOMATOLOGICZNA DLA DZIECI"],
  zab: ["PORADNIA STOMATOLOGICZNA"],
  zeby: ["PORADNIA STOMATOLOGICZNA"],
  ortodonta: ["PORADNIA ORTODONTYCZNA (UDZIELA ŚWIADCZEŃ DLA DZIECI I MŁODZIEŻY W RAMACH UMOWY Z NFZ DO 18 R.Ż).", "PORADNIA ORTODONTYCZNA DLA DZIECI"],
  aparat: ["PORADNIA ORTODONTYCZNA (UDZIELA ŚWIADCZEŃ DLA DZIECI I MŁODZIEŻY W RAMACH UMOWY Z NFZ DO 18 R.Ż).", "PORADNIA ORTODONTYCZNA DLA DZIECI"],
  proteza: ["PORADNIA PROTETYKI STOMATOLOGICZNEJ"],
  protetyk: ["PORADNIA PROTETYKI STOMATOLOGICZNEJ"],
  ginekolog: ["PORADNIA POŁOŻNICZO-GINEKOLOGICZNA"],
  poloznik: ["PORADNIA POŁOŻNICZO-GINEKOLOGICZNA"],
  ciaza: ["PORADNIA POŁOŻNICZO-GINEKOLOGICZNA"],
  dermatolog: ["PORADNIA DERMATOLOGICZNA", "PORADNIA DERMATOLOGICZNA DLA DZIECI"],
  skora: ["PORADNIA DERMATOLOGICZNA", "PORADNIA DERMATOLOGICZNA DLA DZIECI"],
  alergolog: ["PORADNIA ALERGOLOGICZNA", "PORADNIA ALERGOLOGICZNA DLA DZIECI"],
  alergia: ["PORADNIA ALERGOLOGICZNA", "PORADNIA ALERGOLOGICZNA DLA DZIECI"],
  reumatolog: ["PORADNIA REUMATOLOGICZNA", "PORADNIA REUMATOLOGICZNA DLA DZIECI"],
  psychiatra: ["PORADNIA ZDROWIA PSYCHICZNEGO", "PORADNIA ZDROWIA PSYCHICZNEGO DLA DZIECI"],
  depresja: ["PORADNIA ZDROWIA PSYCHICZNEGO", "PORADNIA ZDROWIA PSYCHICZNEGO DLA DZIECI"],
  psycholog: ["PORADNIA PSYCHOLOGICZNA", "PORADNIA PSYCHOLOGICZNA DLA DZIECI"],
  logopeda: ["PORADNIA LOGOPEDYCZNA", "PORADNIA LOGOPEDYCZNA DLA DZIECI"],
  rehabilitacja: ["PORADNIA REHABILITACYJNA", "FIZJOTERAPIA AMBULATORYJNA", "FIZJOTERAPIA DOMOWA"],
  fizjoterapeuta: ["FIZJOTERAPIA AMBULATORYJNA", "FIZJOTERAPIA DOMOWA", "PORADNIA REHABILITACYJNA"],
  fizjoterapia: ["FIZJOTERAPIA AMBULATORYJNA", "FIZJOTERAPIA DOMOWA", "PORADNIA REHABILITACYJNA"],
  geriatra: ["PORADNIA GERIATRYCZNA"],
  senior: ["PORADNIA GERIATRYCZNA"],
  hematolog: ["PORADNIA HEMATOLOGICZNA"],
  krew: ["PORADNIA HEMATOLOGICZNA"],
  neurochirurg: ["PORADNIA NEUROCHIRURGICZNA"],
  kardiochirurg: ["PORADNIA KARDIOCHIRURGICZNA"],
  proktolog: ["PORADNIA PROKTOLOGICZNA"],
  hemoroidy: ["PORADNIA PROKTOLOGICZNA"],
  hepatolog: ["PORADNIA HEPATOLOGICZNA"],
  watroba: ["PORADNIA HEPATOLOGICZNA"],
  chirurg: ["PORADNIA CHIRURGII OGÓLNEJ", "PORADNIA CHIRURGII OGÓLNEJ DLA DZIECI"],
  zylaki: ["PORADNIA CHIRURGII NACZYNIOWEJ"],
  bol: ["PORADNIA LECZENIA BÓLU"],
  "medycyna sportowa": ["PORADNIA MEDYCYNY SPORTOWEJ", "PORADNIA MEDYCYNY SPORTOWEJ DLA DZIECI"],
  genetyk: ["PORADNIA GENETYCZNA", "PORADNIA GENETYCZNA DLA DZIECI"],
  dietetyk: ["PORADNIA ŻYWIENIOWA", "PORADNIA ŻYWIENIOWA DLA DZIECI"],
  "wady postawy": ["PORADNIA WAD POSTAWY"],
  uzaleznien: ["PORADNIA LECZENIA UZALEŻNIEŃ", "PORADNIA TERAPII UZALEŻNIENIA OD ALKOHOLU I WSPÓŁUZALEŻNIENIA"],
  alkohol: ["PORADNIA TERAPII UZALEŻNIENIA OD ALKOHOLU I WSPÓŁUZALEŻNIENIA", "PORADNIA LECZENIA UZALEŻNIEŃ"],
  zakazne: ["PORADNIA CHORÓB ZAKAŹNYCH"],
  audiolog: ["PORADNIA AUDIOLOGICZNA", "PORADNIA AUDIOLOGICZNA DLA DZIECI"],
  sluch: ["PORADNIA AUDIOLOGICZNA", "PORADNIA AUDIOLOGICZNA DLA DZIECI"],
  foniatra: ["PORADNIA FONIATRYCZNA"],
  neonatolog: ["PORADNIA NEONATOLOGICZNA"],
  osteoporoza: ["PORADNIA ENDOKRYNOLOGICZNA OSTEOPOROZY"],
  tomografia: ["TOMOGRAFIA KOMPUTEROWA"],
};

// Specjalizacje spoza Informatora (stan słownika 19.07.2026): pokazujemy to,
// co JEST (oddziały szpitalne), plus uczciwą notę dokąd iść po poradnię.
const NOTA_KARDIOLOG =
  "Uwaga: poradni kardiologicznej NIE ma w Informatorze NFZ (kardiologia przeszła do centralnej e-rejestracji). Poniżej szpitalne ODDZIAŁY kardiologiczne. Terminy do poradni: pacjent.gov.pl lub tel. 800 190 590.";
const POZA_INFORMATOREM = {
  kardiolog: { matches: ["ODDZIAŁ KARDIOLOGICZNY", "ODDZIAŁ KARDIOLOGICZNY DLA DZIECI"], note: NOTA_KARDIOLOG },
  serce: { matches: ["ODDZIAŁ KARDIOLOGICZNY", "ODDZIAŁ KARDIOLOGICZNY DLA DZIECI"], note: NOTA_KARDIOLOG },
};

function norm(s) {
  return s
    .toLowerCase()
    .replaceAll("ą", "a").replaceAll("ć", "c").replaceAll("ę", "e")
    .replaceAll("ł", "l").replaceAll("ń", "n").replaceAll("ó", "o")
    .replaceAll("ś", "s").replaceAll("ź", "z").replaceAll("ż", "z")
    .trim();
}

const BENEFITS_NORM = BENEFITS.map((b) => ({ raw: b, n: norm(b) }));

// Zwraca { matches: [nazwy świadczeń], note: string|null }
export function suggest(query, limit = 8) {
  const q = norm(query);
  if (q.length < 3) return { matches: [], note: "Wpisz co najmniej 3 znaki." };

  for (const [key, v] of Object.entries(POZA_INFORMATOREM)) {
    if (q.includes(norm(key))) return { matches: v.matches, note: v.note };
  }

  const hits = new Set();
  for (const [key, names] of Object.entries(SYNONIMY)) {
    if (q.includes(norm(key)) || norm(key).includes(q)) names.forEach((n) => hits.add(n));
  }
  // Fuzzy po pełnym słowniku: każde słowo zapytania musi wystąpić w nazwie.
  // Prosty stemming polskich końcówek fleksyjnych: porównujemy po rdzeniu słowa
  // (np. "zdrowie" -> "zdro" pasuje do "zdrowia").
  const stem = (w) => w.slice(0, Math.max(4, w.length - 3));
  const words = q.split(/\s+/).filter((w) => w.length >= 3).map(stem);
  if (words.length) {
    for (const b of BENEFITS_NORM) {
      if (words.every((w) => b.n.includes(w))) hits.add(b.raw);
      if (hits.size >= limit * 3) break;
    }
  }
  // Krótsze nazwy (bez "DLA DZIECI") na górze; "ŚWIADCZENIA Z ZAKRESU" przed oddziałami.
  const ranked = [...hits].sort((a, b) => {
    const pa = (a.startsWith("ŚWIADCZENIA") ? 0 : a.startsWith("PORADNIA") ? 1 : 2) + (a.includes("DLA DZIECI") ? 0.5 : 0);
    const pb = (b.startsWith("ŚWIADCZENIA") ? 0 : b.startsWith("PORADNIA") ? 1 : 2) + (b.includes("DLA DZIECI") ? 0.5 : 0);
    return pa - pb || a.length - b.length;
  });
  return { matches: ranked.slice(0, limit), note: ranked.length ? null : "Nie znalazłem takiego świadczenia w słowniku NFZ. Spróbuj innej nazwy (np. 'okulista', 'ortopeda')." };
}

// Kody oddziałów wojewódzkich NFZ (parametr province w API).
export const WOJEWODZTWA = {
  "01": "dolnośląskie",
  "02": "kujawsko-pomorskie",
  "03": "lubelskie",
  "04": "lubuskie",
  "05": "łódzkie",
  "06": "małopolskie",
  "07": "mazowieckie",
  "08": "opolskie",
  "09": "podkarpackie",
  "10": "podlaskie",
  "11": "pomorskie",
  "12": "śląskie",
  "13": "świętokrzyskie",
  "14": "warmińsko-mazurskie",
  "15": "wielkopolskie",
  "16": "zachodniopomorskie",
};
