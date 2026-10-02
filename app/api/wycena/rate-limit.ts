import { isIP } from "node:net";

/**
 * Adres klienta i lokalny limiter zapytań.
 *
 * To NIE jest rozproszony rate limiter. Głównym limitem na produkcji jest
 * reguła Vercel WAF dla POST /api/wycena; ten licznik żyje w pamięci jednej
 * instancji funkcji i jest tylko tanią drugą warstwą na serie z jednego adresu.
 *
 * Moduł nie importuje niczego z projektu, więc testy (tests/) ładują go
 * bezpośrednio przez `node --test`.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
/* Sprzątanie jest leniwe (przy żądaniu), bez timerów trzymających instancję. */
const SWEEP_EVERY_MS = 60 * 1000;
/* Twardy sufit pamięci na wypadek zalewu z wielu adresów w jednym oknie. */
const MAX_KEYS = 10_000;

const UNKNOWN = "unknown";

/* Tylko znaki adresu IP: odpada identyfikator strefy („%eth0”), port, spacje
   i listy rozdzielane przecinkami, zanim wartość trafi do isIP(). */
const IP_CHARS = /^[0-9A-Fa-f:.]{2,45}$/;

/** Osiem 16-bitowych grup adresu IPv6 już sprawdzonego przez isIP(). */
function hextets(v6: string): number[] {
  let s = v6;
  if (s.includes(".")) {
    /* Końcówka w zapisie IPv4 („::ffff:192.0.2.1”) → dwie grupy szesnastkowe. */
    const cut = s.lastIndexOf(":") + 1;
    const [a, b, c, d] = s.slice(cut).split(".").map(Number);
    s = `${s.slice(0, cut)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = s.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const zeros = tail === undefined ? 0 : 8 - left.length - right.length;
  return [...left, ...Array<string>(zeros).fill("0"), ...right].map((h) => parseInt(h, 16));
}

/**
 * Jedna wartość nagłówka → poprawny adres albo null. IPv4 zapisany jako
 * IPv6 („::ffff:a.b.c.d”) wraca jako zwykły IPv4, żeby ten sam klient nie
 * miał dwóch kubełków.
 */
export function parseIp(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v || !IP_CHARS.test(v)) return null;
  const family = isIP(v);
  if (family === 4) return v;
  if (family !== 6) return null;
  const h = hextets(v);
  if (h.slice(0, 5).every((x) => x === 0) && h[5] === 0xffff) {
    return `${h[6] >> 8}.${h[6] & 0xff}.${h[7] >> 8}.${h[7] & 0xff}`;
  }
  return v.toLowerCase();
}

/**
 * Adres klienta. Na Vercel `x-real-ip` i `x-forwarded-for` ustawia platforma
 * (nadpisuje wartość od klienta) i oba niosą jeden adres. Wartość, która nie
 * jest dokładnie jednym poprawnym adresem — lista po przecinku, śmieci, pusty
 * nagłówek — jest pomijana, a nie „naprawiana”.
 */
export function clientIp(req: Request): string | null {
  return parseIp(req.headers.get("x-real-ip")) ?? parseIp(req.headers.get("x-forwarded-for"));
}

/**
 * Klucz licznika. IPv4 — pełny adres. IPv6 — tylko prefiks /64: jeden klient
 * dostaje zwykle całą taką podsieć, więc pełny adres dałoby się zmieniać przy
 * każdym żądaniu. Reszta adresu IPv6 nie jest przechowywana. Brak adresu →
 * jeden wspólny kubełek.
 */
export function rateLimitKey(ip: string | null): string {
  if (!ip) return UNKNOWN;
  if (isIP(ip) !== 6) return ip;
  return `${hextets(ip)
    .slice(0, 4)
    .map((x) => x.toString(16))
    .join(":")}::/64`;
}

export function createRateLimiter() {
  const hits = new Map<string, number[]>();
  let lastSweep = 0;

  /* Usuwa wpisy, których wszystkie trafienia wypadły z okna. */
  function sweep(now: number) {
    lastSweep = now;
    for (const [key, times] of hits) {
      if (now - times[times.length - 1] >= WINDOW_MS) hits.delete(key);
    }
  }

  return {
    /** true = żądanie ponad limit. Niczego nie loguje. */
    limited(req: Request, now = Date.now()): boolean {
      if (now - lastSweep >= SWEEP_EVERY_MS || hits.size >= MAX_KEYS) sweep(now);

      const key = rateLimitKey(clientIp(req));
      const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
      /* Odrzucone żądanie nie jest dopisywane: lista ma najwyżej
         MAX_PER_WINDOW pozycji, a blokada nie przedłuża się w nieskończoność. */
      if (recent.length >= MAX_PER_WINDOW) {
        hits.set(key, recent);
        return true;
      }

      if (!hits.has(key) && hits.size >= MAX_KEYS) {
        /* Nadal pełno po sprzątaniu — ustępuje najstarszy wpis. */
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) hits.delete(oldest);
      }
      recent.push(now);
      hits.set(key, recent);
      return false;
    },
    /** Liczba śledzonych kluczy — do testów. */
    size: () => hits.size,
  };
}

const limiter = createRateLimiter();

export function rateLimited(req: Request) {
  return limiter.limited(req);
}
