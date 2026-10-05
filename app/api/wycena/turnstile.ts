/**
 * Cloudflare Turnstile — główna ochrona formularza przed botami. Działa
 * „fail closed”: brak sekretu, brak lub błędna lista hostów, brak tokenu,
 * odmowa, timeout albo błąd Siteverify oznaczają odrzucenie zgłoszenia.
 *
 * Udana weryfikacja musi być związana z tym formularzem: akcja widgetu
 * (`wycena`, components/wycena/Turnstile.tsx) i host, na którym rozwiązano
 * wyzwanie, z jawnej listy TURNSTILE_ALLOWED_HOSTNAMES (tylko serwer).
 *
 * Moduł nie importuje niczego z projektu, więc testy (tests/) ładują go
 * bezpośrednio przez `node --test`.
 */

export const TURNSTILE_ACTION = "wycena";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 8000;
/* Limit z dokumentacji Cloudflare. */
const MAX_TOKEN_LENGTH = 2048;

/* Publiczne klucze testowe Cloudflare (zawsze zalicza / odrzuca / „zużyty”).
   Klucz zaliczający przyjmuje wyłącznie publiczny token testowy i odpowiada
   akcją „test” z hosta „localhost” — w produkcji oznaczałby brak ochrony. */
const TEST_SECRET = /^[123]x0{31}AA$/;
const TEST_PASS_SECRET = "1x0000000000000000000000000000000AA";
const TEST_ACTION = "test";

/* Jedna nazwa hosta: etykiety z liter, cyfr i „-”, bez schematu, ścieżki,
   portu i gwiazdki. */
const HOSTNAME = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;

/**
 * TURNSTILE_ALLOWED_HOSTNAMES → zbiór dokładnych hostów albo null.
 * Wpisy rozdzielone przecinkami, przycięte i zamienione na małe litery.
 * Jeden błędny wpis (pusty, z „https://”, ścieżką, portem, „*”) unieważnia
 * całą konfigurację — lepiej odrzucić zgłoszenia, niż zgadywać.
 */
export function parseAllowedHostnames(raw: unknown): Set<string> | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const hosts = raw.split(",").map((h) => h.trim().toLowerCase());
  if (hosts.some((h) => !HOSTNAME.test(h))) return null;
  return new Set(hosts);
}

type Check = "ok" | "not_success" | "action" | "hostname";

/** Wynik Siteverify związany z akcją i hostem. Dokładne porównania. */
export function checkSiteverify(data: unknown, hostnames: Set<string>, expectedAction: string): Check {
  if (typeof data !== "object" || data === null) return "not_success";
  const { success, action, hostname } = data as { success?: unknown; action?: unknown; hostname?: unknown };
  if (success !== true) return "not_success";
  if (action !== expectedAction) return "action";
  if (typeof hostname !== "string" || !hostnames.has(hostname.toLowerCase())) return "hostname";
  return "ok";
}

/* Do logu tylko wartości w przewidywalnym kształcie — nic, co mogłoby nieść
   dane, token albo znaki sterujące. */
const loggable = (value: unknown, pattern: RegExp) =>
  typeof value === "string" && pattern.test(value) ? value : "(brak lub nieprawidłowa)";

export type TurnstileEnv = {
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_ALLOWED_HOSTNAMES?: string;
  VERCEL_ENV?: string;
};

/**
 * Weryfikacja tokenu w Siteverify. `remoteIp` to zwalidowany adres klienta
 * albo null. Zwraca wyłącznie true/false; przeglądarka dostaje tylko ogólny
 * kod VERIFICATION_FAILED. Nie loguje tokenu, sekretu ani adresu IP.
 */
export async function verifyTurnstileToken(
  token: unknown,
  remoteIp: string | null,
  env: TurnstileEnv,
): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[wycena] Turnstile: brak TURNSTILE_SECRET_KEY — zgłoszenie odrzucone");
    return false;
  }
  const testKeys = TEST_SECRET.test(secret);
  if (testKeys && env.VERCEL_ENV === "production") {
    console.error("[wycena] Turnstile: testowy klucz Cloudflare w produkcji — zgłoszenie odrzucone");
    return false;
  }
  const hostnames = parseAllowedHostnames(env.TURNSTILE_ALLOWED_HOSTNAMES);
  if (!hostnames) {
    console.error("[wycena] Turnstile: brak lub błędna TURNSTILE_ALLOWED_HOSTNAMES — zgłoszenie odrzucone");
    return false;
  }
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LENGTH) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    const data: unknown = await res.json().catch(() => null);
    /* Klucz testowy zawsze odpowiada akcją „test”; poza produkcją to jedyny
       wyjątek od akcji formularza. */
    const expectedAction = secret === TEST_PASS_SECRET ? TEST_ACTION : TURNSTILE_ACTION;
    const check = res.ok ? checkSiteverify(data, hostnames, expectedAction) : "not_success";

    if (check === "not_success") {
      /* W logu tylko kody błędów Cloudflare — bez tokenu i sekretu. */
      const result = (data ?? {}) as { "error-codes"?: unknown };
      const codes = Array.isArray(result["error-codes"])
        ? result["error-codes"].filter((c) => typeof c === "string" && /^[\w-]{1,40}$/.test(c))
        : [];
      console.error(
        `[wycena] Turnstile odrzucił zgłoszenie: HTTP ${res.status}${codes.length ? ` (${codes.join(", ")})` : ""}`,
      );
      return false;
    }
    if (check === "action") {
      const action = loggable((data as { action?: unknown }).action, /^[\w-]{1,32}$/);
      console.error(`[wycena] Turnstile: niezgodna akcja (${action}) — zgłoszenie odrzucone`);
      return false;
    }
    if (check === "hostname") {
      /* Host z odpowiedzi pomaga wykryć brakujący wpis po zmianie domeny. */
      const hostname = loggable((data as { hostname?: unknown }).hostname, HOSTNAME);
      console.error(`[wycena] Turnstile: host spoza TURNSTILE_ALLOWED_HOSTNAMES (${hostname}) — zgłoszenie odrzucone`);
      return false;
    }
    return true;
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    console.error(`[wycena] Turnstile: ${timeout ? "przekroczony czas odpowiedzi" : "brak połączenia z"} Siteverify`);
    return false;
  }
}
