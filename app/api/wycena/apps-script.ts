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

/**
 * Wysyła `payload` (z sekretem) do webhooka i zwraca JSON z wynikiem doPost.
 * Sukces to wyłącznie HTTP OK z JSON `{ ok: true }` — samo 200 nie wystarcza,
 * bo Apps Script zwraca 200 także przy błędzie.
 *
 * `timeoutMs` to jeden wspólny budżet na POST, odczyt przekierowania i treść
 * odpowiedzi. Nie ponawia POST. Nie rzuca wyjątków.
 *
 * W logach wyłącznie status, etap i krótki kod — nigdy adres webhooka, cel
 * przekierowania (zawiera jednorazowy token) ani treść żądania.
 */
export async function callAppsScript(
  webhookUrl: unknown,
  payload: unknown,
  timeoutMs: number,
): Promise<AppsScriptResult> {
  const target = appsScriptWebhookUrl(webhookUrl);
  if (!target) {
    console.error("[wycena] GOOGLE_LEADS_WEBHOOK_URL ma nieprawidłowy format — zapis w Google pominięty");
    return { ok: false, reason: "not_configured" };
  }

  const signal = AbortSignal.timeout(timeoutMs);
  try {
    let stage = "POST";
    let res = await fetch(target.href, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "manual",
      cache: "no-store",
      signal,
    });

    if (REDIRECT_STATUSES.has(res.status)) {
      const next = appsScriptRedirectUrl(res.headers.get("location"));
      await res.body?.cancel().catch(() => {});
      if (!next) {
        console.error("[wycena] Apps Script nie potwierdził zapisu: niedozwolony cel przekierowania");
        return { ok: false, reason: "failed" };
      }
      /* Sam GET: bez sekretu, treści i nagłówków. Kolejne przekierowanie
         nie jest śledzone — skończy jako błąd HTTP 3xx poniżej. */
      stage = "odczyt odpowiedzi";
      res = await fetch(next.href, { method: "GET", redirect: "manual", cache: "no-store", signal });
    }

    const data: unknown = await res.json().catch(() => null);
    if (signal.aborted) throw signal.reason;

    if (!res.ok || typeof data !== "object" || data === null || (data as { ok?: unknown }).ok !== true) {
      /* Lead mógł zostać zapisany — nie udało się tylko odebrać potwierdzenia.
         Treść odpowiedzi zostaje na serwerze; w logu status, etap i krótki kod. */
      const code = (data as { code?: unknown } | null)?.code;
      const safeCode = typeof code === "string" && /^[\w-]{1,40}$/.test(code) ? ` (${code})` : "";
      console.error(`[wycena] Apps Script nie potwierdził zapisu: HTTP ${res.status}${safeCode}, etap: ${stage}`);
      return { ok: false, reason: "failed" };
    }
    return { ok: true, data: data as Record<string, unknown> };
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    console.error(`[wycena] ${timeout ? "Przekroczony czas odpowiedzi" : "Brak połączenia z"} Apps Script`);
    return { ok: false, reason: "failed" };
  }
}
