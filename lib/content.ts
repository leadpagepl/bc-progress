/**
 * Jedno źródło prawdy dla treści strony.
 *
 * Zasada: nic, czego nie potwierdza rejestr, dokument publiczny albo zdjęcie
 * dostarczone przez klienta. Brak wymyślonych lokalizacji, dat, liczb i opinii.
 * Pełny wykaz zdjęć: public/assets/bc-progres/ASSETS.md
 */

const IMG = "/assets/bc-progres/img";

export const company = {
  name: "BC PROGRES sp. z o.o.",
  shortName: "BC PROGRES",
  krs: "0001184891",
  nip: "7352934283",
  regon: "542309226",
  registered: "lipiec 2025",
  address: {
    line1: "Osiedle Równie 2",
    line2: "34-452 Ochotnica Dolna",
  },
  instagram: "https://www.instagram.com/bcprogres/",
  facebook: "https://www.facebook.com/profile.php?id=61582770722326",
  krsSource: "https://rejestr.io/krs/1184891/bc-progres",
} as const;

export const nav = [
  { label: "Realizacje", href: "#realizacje" },
  { label: "Co robimy", href: "#zakres" },
  { label: "O firmie", href: "#o-firmie" },
  { label: "Kontakt", href: "#kontakt" },
] as const;

export type Project = {
  id: string;
  title: string;
  /** Krótsza etykieta na kafel siatki, gdy pełna nazwa jest za długa. */
  short?: string;
  type: string;
  photos: { src: string; alt: string }[];
};

/** Kolejność = rytm siatki w sekcji Realizacje. */
export const projects: Project[] = [
  {
    id: "dom-blacha",
    title: "Dom jednorodzinny",
    type: "Budynek mieszkalny",
    photos: [
      { src: `${IMG}/bud23.jpg`, alt: "Gotowy dom jednorodzinny z białą elewacją i ciemnym dachem" },
      { src: `${IMG}/bud26.jpg`, alt: "Detal dachu z blachy układanej na rąbek stojący" },
      { src: `${IMG}/bud25.jpg`, alt: "Wnętrze domu z dużymi przeszkleniami" },
    ],
  },
  {
    id: "dom-taras",
    title: "Dom z zadaszonym tarasem",
    type: "Budynek mieszkalny",
    photos: [
      { src: `${IMG}/bud29.jpg`, alt: "Budynek z zadaszonym tarasem i drewnianymi słupami" },
      { src: `${IMG}/bud22.jpg`, alt: "Otwór okienny z widokiem na zieleń" },
      { src: `${IMG}/bud24.jpg`, alt: "Otynkowane wnętrze z przejściem do kolejnego pomieszczenia" },
    ],
  },
  {
    id: "stan-surowy",
    title: "Dom w stanie surowym",
    type: "Budynek mieszkalny",
    photos: [
      { src: `${IMG}/bud7.jpg`, alt: "Szczyt domu w rusztowaniu z widoczną więźbą dachową" },
      { src: `${IMG}/bud8.jpg`, alt: "Dom z lukarnami i dachem z blachy, rusztowanie" },
      { src: `${IMG}/bud11.jpg`, alt: "Elewacja szczytowa domu w rusztowaniu" },
      { src: `${IMG}/bud9.jpg`, alt: "Dom w trakcie budowy, plac z silosem" },
    ],
  },
  {
    id: "obiekt-stalowy",
    title: "Obiekt stalowy",
    type: "Hala / wiata",
    photos: [
      { src: `${IMG}/bud19.jpg`, alt: "Stalowa rama portalowa w trakcie montażu" },
      { src: `${IMG}/bud21.jpg`, alt: "Szkielet stalowy obiektu na tle nieba" },
      { src: `${IMG}/bud20.jpg`, alt: "Obiekt stalowy z gotową obudową" },
    ],
  },
  {
    id: "obiekt-kubaturowy",
    title: "Budynek dwukondygnacyjny",
    short: "Budynek 2-kondygnacyjny",
    type: "Obiekt kubaturowy",
    photos: [
      { src: `${IMG}/bud13.jpg`, alt: "Budynek dwukondygnacyjny w stanie surowym, rusztowanie na elewacji" },
      { src: `${IMG}/bud14.jpg`, alt: "Wnętrze ze stemplami podpierającymi strop żelbetowy" },
      { src: `${IMG}/bud17.jpg`, alt: "Żelbetowe schody wewnątrz budynku" },
    ],
  },
  {
    id: "wiezba",
    title: "Więźba i stropy drewniane",
    short: "Więźba i stropy",
    type: "Dach i stropy",
    photos: [
      { src: `${IMG}/bud18.jpg`, alt: "Pomieszczenie z odsłoniętą więźbą dachową" },
      { src: `${IMG}/bud16.jpg`, alt: "Więźba dachowa widziana od wewnątrz" },
      { src: `${IMG}/realizacja1.jpg`, alt: "Korytarz z drewnianym stropem" },
    ],
  },
  {
    id: "boisko",
    title: "Boisko wielofunkcyjne",
    type: "Nawierzchnie sportowe",
    photos: [
      { src: `${IMG}/boisko1.jpg`, alt: "Boisko wielofunkcyjne z bramką i koszem" },
      { src: `${IMG}/boisko3.jpg`, alt: "Boisko z masztami oświetleniowymi, ujęcie szerokie" },
      { src: `${IMG}/boisko2.jpg`, alt: "Boisko z siatką do siatkówki" },
      { src: `${IMG}/boisko4.jpg`, alt: "Nawierzchnia boiska z herbem klubu" },
    ],
  },
];

/**
 * Zakres prac.
 *
 * Jedna lista zamiast dwóch: dawne „Etapy robót" i „Zakres" powtarzały te same
 * pozycje. Każdy wpis ma pokrycie w dostarczonej dokumentacji zdjęciowej.
 * Numeracja porządkuje listę, nie opisuje przebiegu jednej budowy. Zdjęcia
 * pochodzą z różnych realizacji i strona mówi o tym wprost.
 */
export type Work = {
  no: string;
  title: string;
  note: string;
  photo: { src: string; alt: string };
};

export const works: Work[] = [
  {
    no: "01",
    title: "Budowa domów",
    note: "Stan surowy otwarty i zamknięty.",
    photo: {
      src: `${IMG}/bud23.jpg`,
      alt: "Gotowy dom jednorodzinny z białą elewacją i ciemnym dachem",
    },
  },
  {
    no: "02",
    title: "Prace ziemne",
    note: "Przygotowanie terenu, wykopy, niwelacja.",
    photo: {
      src: `${IMG}/bud6.jpg`,
      alt: "Koparka podczas robót ziemnych na nasypie",
    },
  },
  {
    no: "03",
    title: "Fundamenty",
    note: "Zbrojenie, szalunki, beton.",
    photo: {
      src: `${IMG}/bud3.jpg`,
      alt: "Zbrojenie ław fundamentowych w wykopie",
    },
  },
  {
    no: "04",
    title: "Mury i stropy",
    note: "Ściany, stropy żelbetowe, schody.",
    photo: {
      src: `${IMG}/bud14.jpg`,
      alt: "Stemple podpierające strop żelbetowy nad murowanymi ścianami",
    },
  },
  {
    no: "05",
    title: "Więźba dachowa",
    note: "Drewniana więźba i stropy.",
    photo: {
      src: `${IMG}/bud16.jpg`,
      alt: "Drewniana więźba dachowa widziana od wewnątrz",
    },
  },
  {
    no: "06",
    title: "Pokrycia dachowe",
    note: "Blacha, obróbki blacharskie, orynnowanie.",
    photo: {
      src: `${IMG}/bud26.jpg`,
      alt: "Dach z blachy na rąbek stojący z rynnami",
    },
  },
  {
    no: "07",
    title: "Hale i wiaty stalowe",
    note: "Montaż ram stalowych i obudowa obiektu.",
    photo: {
      src: `${IMG}/bud19.jpg`,
      alt: "Montaż stalowej ramy portalowej",
    },
  },
  {
    no: "08",
    title: "Nawierzchnie sportowe",
    note: "Podbudowa i nawierzchnia boisk.",
    photo: {
      src: `${IMG}/boisko1.jpg`,
      alt: "Gotowe boisko wielofunkcyjne z bramką i koszem",
    },
  },
];

/** Wyłącznie kontrakty potwierdzone publicznie. Podpisanie ≠ zakończenie. */
export const contracts = [
  {
    client: "MZWiK w Nowym Targu sp. z o.o.",
    name: "Rozbiórka obiektu magazynowego oraz budowa budynku biurowo-socjalnego wraz z infrastrukturą techniczną stanowiącego zaplecze socjalne dla pracowników oczyszczalni ścieków",
    place: "Oczyszczalnia ścieków, ul. Polna 51, Nowy Targ",
    signed: "11.02.2026",
    deadline: "30.06.2027",
    status: "Umowa podpisana, realizacja w toku",
    source:
      "https://mzwik.nowytarg.pl/podpisanie-umowy-o-na-realizacje-zadania-pn-rozbiorka-obiektu-magazynowego-oraz-budowa-budynku-biurowo-socjalnego-wraz-z-infrastruktura-techniczna-stanowiacego-zaplecze-socjalne-dla-pracowni/",
    sourceLabel: "mzwik.nowytarg.pl",
  },
] as const;

/* ------------------------------------------------------------------ *
 * Mapa — adres rejestrowy spółki.
 * Osadzamy sam adres, a nie wizytówkę Google: firma nie ma
 * zweryfikowanego profilu, więc pinezka nie jest opisywana jako biuro.
 * ------------------------------------------------------------------ */
export const mapQuery = "os. Równie 2, 34-452 Ochotnica Dolna, Polska";

export const mapEmbedUrl = `https://www.google.com/maps?q=${encodeURIComponent(
  mapQuery,
)}&hl=pl&z=14&output=embed`;

export const mapLinkUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  mapQuery,
)}`;

/* ------------------------------------------------------------------ *
 * Zapytanie o wycenę. Formularz żyje w modalu, nie na osobnej stronie.
 * ------------------------------------------------------------------ */

/** Rodzaje inwestycji. Celowo szerokie, żeby nie obiecywać usług,
 *  których firma nie potwierdziła. */
export const projectTypes = [
  { id: "dom", label: "Dom", note: "Budynek mieszkalny." },
  { id: "obiekt", label: "Obiekt budowlany", note: "Hala, wiata, budynek użytkowy." },
  { id: "prace", label: "Prace budowlane", note: "Wybrany zakres robót." },
  { id: "inna", label: "Inna inwestycja", note: "Opowiedz nam o niej." },
] as const;

/** Limity załączników. Te same wartości obowiązują w przeglądarce i na
 *  serwerze — przeglądarka daje wygodę, serwer decyduje. */
export const uploadLimits = {
  maxFiles: 4,
  maxFileBytes: 4 * 1024 * 1024,
  maxTotalBytes: 8 * 1024 * 1024,
  accept: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  acceptAttr: ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf",
} as const;

/* ------------------------------------------------------------------ *
 * Większe inwestycje.
 *
 * Punkty opisują ZAKRES prac, a nie jakość — jedynym twardym dowodem jest
 * publicznie potwierdzony kontrakt MZWiK, do którego sekcja linkuje.
 * ------------------------------------------------------------------ */
export const wiekszeInwestycje = [
  { nr: "01", label: "Większe zakresy robót" },
  { nr: "02", label: "Obiekty użytkowe i instytucjonalne" },
  { nr: "03", label: "Prace w ramach przetargów" },
  { nr: "04", label: "Od prac ziemnych po dach" },
] as const;
