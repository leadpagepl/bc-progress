/**
 * Protokół webhooka Google Apps Script (ContentService).
 *
 * doPost kończy się przekierowaniem na jednorazowy adres w
 * script.googleusercontent.com — dopiero tam leży JSON z wynikiem. Obsługa
 * jest jawna: POST z sekretem idzie wyłącznie na zwalidowany adres
 * script.google.com, a wynik pobiera osobny GET bez treści i nagłówków.
 *
 * Moduł nie importuje niczego w czasie działania, więc testy (tests/) ładują
 * go bezpośrednio przez `node --test`.
 */

type AppsScriptFailure = { ok: false; reason: "not_configured" | "failed" };
export type AppsScriptResult = { ok: true; data: Record<string, unknown> } | AppsScriptFailure;

/* Surowa wartość musi już być dokładnie adresem wdrożonej aplikacji:
   samo ASCII, bez portu, loginu, query, fragmentu i wariantu /dev. Parser URL
   po cichu normalizuje (gubi :443, mapuje znaki pełnej szerokości, usuwa
   CR/LF) — takie wejścia odrzucamy, zamiast je naprawiać. */
const RAW_WEBHOOK_URL = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,200}\/exec$/;
const WEBHOOK_PATH = /^\/macros\/s\/[A-Za-z0-9_-]{10,200}\/exec$/;

/* Location z Apps Script jest zawsze adresem bezwzględnym. Wymagany prefiks
   kończy host ukośnikiem, więc odpadają adresy względne i „//host”, login,
   port oraz domeny-podróbki; reszta to drukowalne ASCII. */
const RAW_REDIRECT_URL = /^https:\/\/script\.googleusercontent\.com\/[\x21-\x7E]{0,4000}$/;

/* 307/308 oznaczałyby ponowienie POST z treścią — tego nie robimy. */
const REDIRECT_STATUSES = new Set([301, 302, 303]);

/** Adres webhooka ze zmiennej środowiskowej — traktowany jak niezaufana
 *  konfiguracja. Tylko https://script.google.com/macros/s/<ID>/exec. */
export function appsScriptWebhookUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !RAW_WEBHOOK_URL.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "script.google.com") return null;
  if (url.username || url.password || url.port || url.search || url.hash) return null;
  return WEBHOOK_PATH.test(url.pathname) ? url : null;
}

/** Cel przekierowania z nagłówka Location — tylko
 *  https://script.googleusercontent.com, bez loginu i portu. */
export function appsScriptRedirectUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !RAW_REDIRECT_URL.test(value)) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "script.googleusercontent.com") return null;
  if (url.username || url.password || url.port) return null;
  return url;
}

export type AppsScriptTiming = {
  /** Jeden wspólny termin na całą operację, łącznie z ewentualnym ponowieniem. */
  totalMs: number;
  /** Górny limit pierwszej próby (domyślnie cały budżet). */
  firstAttemptMs?: number;
  /** Ponowienie rusza tylko, jeśli do terminu zostało co najmniej tyle czasu. */
  minRetryMs?: number;
};

const DEFAULT_MIN_RETRY_MS = 5_000;

/** Wynik jednej próby. `confirmation_404` to jedyny przypadek, który wolno
 *  ponowić: Apps Script przyjął POST i odpowiedział poprawnym przekierowaniem
 *  ContentService, ale jednorazowy adres z odpowiedzią zwrócił 404. */
type AttemptOutcome =
  | { kind: "ok"; data: Record<string, unknown> }
  | { kind: "confirmation_404" }
  | { kind: "failed" };

async function attempt(
  target: URL,
  body: string,
  signal: AbortSignal,
  stages: { post: string; read: string },
): Promise<AttemptOutcome> {
  let stage = stages.post;
  try {
    let res = await fetch(target.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      redirect: "manual",
      cache: "no-store",
      signal,
    });

    if (REDIRECT_STATUSES.has(res.status)) {
      const next = appsScriptRedirectUrl(res.headers.get("location"));
      await res.body?.cancel().catch(() => {});
      if (!next) {
        console.error("[wycena] Apps Script nie potwierdził zapisu: niedozwolony cel przekierowania");
        return { kind: "failed" };
      }
      /* Sam GET: bez sekretu, treści i nagłówków. Kolejne przekierowanie
         nie jest śledzone — skończy jako błąd HTTP 3xx poniżej. */
      stage = stages.read;
      res = await fetch(next.href, { method: "GET", redirect: "manual", cache: "no-store", signal });
      if (res.status === 404) {
        await res.body?.cancel().catch(() => {});
        return { kind: "confirmation_404" };
      }
    }

    const data: unknown = await res.json().catch(() => null);
    if (signal.aborted) throw signal.reason;

    if (!res.ok || typeof data !== "object" || data === null || (data as { ok?: unknown }).ok !== true) {
      /* Lead mógł zostać zapisany — nie udało się tylko odebrać potwierdzenia.
         Treść odpowiedzi zostaje na serwerze; w logu status, etap i krótki kod. */
      const code = (data as { code?: unknown } | null)?.code;
      const safeCode = typeof code === "string" && /^[\w-]{1,40}$/.test(code) ? ` (${code})` : "";
      console.error(`[wycena] Apps Script nie potwierdził zapisu: HTTP ${res.status}${safeCode}, etap: ${stage}`);
      return { kind: "failed" };
    }
    return { kind: "ok", data: data as Record<string, unknown> };
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    console.error(
      `[wycena] ${timeout ? "Przekroczony czas odpowiedzi" : "Brak połączenia z"} Apps Script, etap: ${stage}`,
    );
    return { kind: "failed" };
  }
}

/**
 * Wysyła `payload` (z sekretem) do webhooka i zwraca JSON z wynikiem doPost.
 * Sukces to wyłącznie HTTP OK z JSON `{ ok: true }` — samo 200 nie wystarcza,
 * bo Apps Script zwraca 200 także przy błędzie.
 *
 * Jednorazowy adres odpowiedzi ContentService bywa nieczytelny (HTTP 404),
 * mimo że doPost zapisał zgłoszenie. Tylko w tym jednym przypadku idzie
 * JEDNO ponowienie z dokładnie tą samą treścią (ten sam submissionId) —
 * Apps Script pod blokadą rozpoznaje zapisane zgłoszenie i odpowiada
 * `duplicate: true` bez nowego wiersza i folderu. Inne błędy nie są ponawiane.
 *
 * Wszystko mieści się w jednym terminie `timing.totalMs`; ponowienie rusza
 * tylko, gdy zostało co najmniej `minRetryMs`. Nie rzuca wyjątków.
 *
 * W logach wyłącznie status, etap i krótki kod — nigdy adres webhooka, cel
 * przekierowania (zawiera jednorazowy token) ani treść żądania.
 */
export async function callAppsScript(
  webhookUrl: unknown,
  payload: unknown,
  timing: number | AppsScriptTiming,
): Promise<AppsScriptResult> {
  const target = appsScriptWebhookUrl(webhookUrl);
  if (!target) {
    console.error("[wycena] GOOGLE_LEADS_WEBHOOK_URL ma nieprawidłowy format — zapis w Google pominięty");
    return { ok: false, reason: "not_configured" };
  }

  const { totalMs, firstAttemptMs = totalMs, minRetryMs = DEFAULT_MIN_RETRY_MS } =
    typeof timing === "number" ? { totalMs: timing } : timing;
  const deadline = Date.now() + totalMs;
  /* Treść serializowana raz: ponowienie wysyła te same bajty. */
  const body = JSON.stringify(payload);

  const first = await attempt(target, body, AbortSignal.timeout(Math.min(firstAttemptMs, totalMs)), {
    post: "POST",
    read: "odczyt odpowiedzi",
  });
  if (first.kind === "ok") return { ok: true, data: first.data };
  if (first.kind === "failed") return { ok: false, reason: "failed" };

  const remaining = deadline - Date.now();
  if (remaining < minRetryMs) {
    console.error(
      "[wycena] Apps Script nie potwierdził zapisu: HTTP 404, etap: odczyt odpowiedzi — za mało czasu na ponowienie",
    );
    return { ok: false, reason: "failed" };
  }
  console.warn("[wycena] Odpowiedź Apps Script wygasła (HTTP 404); ponawiam zapis z tym samym identyfikatorem zgłoszenia");

  const second = await attempt(target, body, AbortSignal.timeout(remaining), {
    post: "ponowny POST",
    read: "ponowny odczyt odpowiedzi",
  });
  if (second.kind === "ok") {
    console.info("[wycena] Zapis potwierdzony po ponowieniu");
    return { ok: true, data: second.data };
  }
  if (second.kind === "confirmation_404") {
    console.error("[wycena] Apps Script nie potwierdził zapisu: HTTP 404, etap: ponowny odczyt odpowiedzi");
  }
  return { ok: false, reason: "failed" };
}
