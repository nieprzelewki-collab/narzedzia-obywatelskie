// GSL = oficjalna wyszukiwarka NFZ "Gdzie się leczyć".
// Ta warstwa nie scrapuje wyników i nie używa kluczy z cudzej strony.
// Zwraca bezpieczny katalog kategorii + routing intencji do oficjalnych URL-i.
const GSL_ROOT = "https://gsl.nfz.gov.pl/GSL/GSL";

const CATEGORY_DEFS = [
  {
    id: "sor",
    nr: "GSL 01",
    title: "Szpitalny Oddział Ratunkowy",
    shortTitle: "SOR",
    path: "/SOR",
    searchPath: "/SORSearch",
    group: "pomoc-dorazna",
    keywords: ["sor", "ratunkowy", "wypadek", "uraz", "nagly", "nagła", "szpital", "karetka", "krwawienie"],
    description: "Gdy sprawa jest nagła i wymaga pomocy szpitalnej.",
  },
  {
    id: "pomoc-nocna",
    nr: "GSL 02",
    title: "Nocna i świąteczna pomoc POZ",
    shortTitle: "Nocna pomoc",
    path: "/PomocNocna",
    searchPath: "/PomocNocnaSearch",
    group: "pomoc-dorazna",
    keywords: ["noc", "nocna", "święto", "swieto", "weekend", "wieczor", "wieczór", "poz zamkniety", "goraczka"],
    description: "Wieczorem, w nocy, w weekend albo święto, gdy POZ nie pracuje.",
  },
  {
    id: "izba-przyjec",
    nr: "GSL 03",
    title: "Izby przyjęć",
    shortTitle: "Izba przyjęć",
    path: "/IzbaPrzyjec",
    searchPath: "/IzbaPrzyjecSearch",
    group: "pomoc-dorazna",
    keywords: ["izba", "przyjec", "przyjęć", "szpital", "przyjecie", "przyjęcie"],
    description: "Miejsca przy szpitalach udzielające pomocy w trybie przyjęcia.",
  },
  {
    id: "stomatologia-dorazna",
    nr: "GSL 04",
    title: "Pomoc stomatologiczna doraźna",
    shortTitle: "Dentysta doraźnie",
    path: "/LeczenieStomatologiczneDorazne",
    searchPath: "/LeczenieStomatologiczneDorazneSearch",
    group: "pomoc-dorazna",
    keywords: ["ząb", "zab", "zęby", "zeby", "dentysta", "stomatolog", "stomatologiczna", "bol zeba", "ból zęba"],
    description: "Gdy chodzi o nagły problem stomatologiczny finansowany przez NFZ.",
  },
  {
    id: "poz",
    nr: "GSL 05",
    title: "Lekarz, pielęgniarka i położna POZ",
    shortTitle: "POZ",
    path: "/POZ",
    searchPath: "/POZSearch",
    group: "opieka-podstawowa",
    keywords: ["poz", "lekarz rodzinny", "rodzinny", "internista", "pielęgniarka", "pielegniarka", "położna", "polozna"],
    description: "Podstawowa opieka zdrowotna: gabinet lekarza POZ, pielęgniarki lub położnej.",
  },
  {
    id: "programy-profilaktyczne",
    nr: "GSL 06",
    title: "Programy profilaktyczne",
    shortTitle: "Profilaktyka",
    path: "/ProgramyProfilaktyczne",
    searchPath: "/ProgramyProfilaktyczneSearch",
    group: "profilaktyka",
    keywords: ["profilaktyka", "profilaktyczne", "badania przesiewowe", "mammografia", "cytologia", "kolonoskopia"],
    description: "Badania i programy profilaktyczne realizowane w ramach NFZ.",
  },
  {
    id: "apteki",
    nr: "GSL 07",
    title: "Apteki",
    shortTitle: "Apteki",
    path: "/Apteki",
    searchPath: "/AptekiSearch",
    group: "apteki",
    keywords: ["apteka", "apteki", "lek", "leki", "recepta", "dyzur", "dyżur"],
    description: "Apteki widoczne w oficjalnej wyszukiwarce NFZ.",
  },
  {
    id: "punkty-zaopatrzenia",
    nr: "GSL 08",
    title: "Punkty zaopatrzenia",
    shortTitle: "Zaopatrzenie",
    path: "/PunktyZaopatrzenia",
    searchPath: "/PunktyZaopatrzeniaSearch",
    group: "zaopatrzenie",
    keywords: ["zaopatrzenie", "orteza", "wózek", "wozek", "sprzet", "sprzęt", "aparat słuchowy", "aparat sluchowy"],
    description: "Punkty realizujące zaopatrzenie w wyroby medyczne.",
  },
];

const CATEGORIES = CATEGORY_DEFS.map((c) => ({
  ...c,
  url: GSL_ROOT + c.path,
  searchUrl: GSL_ROOT + c.searchPath,
}));

function norm(value) {
  return String(value ?? "")
    .toLowerCase()
    .replaceAll("ą", "a").replaceAll("ć", "c").replaceAll("ę", "e")
    .replaceAll("ł", "l").replaceAll("ń", "n").replaceAll("ó", "o")
    .replaceAll("ś", "s").replaceAll("ź", "z").replaceAll("ż", "z")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function gslCategories() {
  return CATEGORIES.map(({ keywords, ...publicCategory }) => publicCategory);
}

export function gslCategory(id) {
  return gslCategories().find((c) => c.id === id) ?? null;
}

export function gslRoute(query, limit = 3) {
  const q = norm(query);
  if (q.length < 2) {
    return {
      query,
      matches: gslCategories().slice(0, limit),
      note: "Wpisz problem po ludzku albo wybierz kategorię z listy.",
      source: "NFZ GSL",
    };
  }

  const scored = CATEGORIES.map((category) => {
    const score = category.keywords.reduce((sum, keyword) => {
      const k = norm(keyword);
      if (!k) return sum;
      if (q === k) return sum + 6;
      if (q.includes(k)) return sum + 4;
      if (k.includes(q)) return sum + 2;
      return sum;
    }, 0);
    return { category, score };
  }).filter((x) => x.score > 0);

  const matches = (scored.length ? scored : CATEGORIES.map((category) => ({ category, score: 0 })))
    .sort((a, b) => b.score - a.score || a.category.nr.localeCompare(b.category.nr))
    .slice(0, limit)
    .map(({ category }) => {
      const { keywords, ...publicCategory } = category;
      return publicCategory;
    });

  return {
    query,
    matches,
    note: scored.length ? null : "Nie mam pewnego dopasowania. Pokazuję najczęściej używane kategorie GSL.",
    source: "NFZ GSL",
  };
}

export function gslLink(id) {
  return gslCategory(id);
}
