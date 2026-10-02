/**
 * Publiczny adres strony — podstawa canonical, Open Graph, sitemap i JSON-LD.
 *
 * Domena nie jest wpisana w kod:
 *   1. SITE_URL — jawne ustawienie (np. gdy adresem głównym ma być „www”),
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel podaje tu najkrótszą domenę
 *      produkcyjną projektu, a bez własnej domeny adres *.vercel.app; jest
 *      ustawiona także w deploymentach preview,
 *   3. lokalnie: localhost.
 * Po podpięciu własnej domeny wystarczy nowy deployment — bez zmian w kodzie.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) {
    try {
      const url = new URL(explicit);
      if (url.protocol === "https:" && !url.username && !url.password) return url.origin;
    } catch {
      /* Błędna wartość — dalej jak bez SITE_URL. */
    }
  }
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production && /^[a-z0-9.-]+$/i.test(production)) return `https://${production}`;
  return "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();
