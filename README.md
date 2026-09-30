# BC PROGRES sp. z o.o. — strona firmowa

Next.js (App Router) + TypeScript + Tailwind CSS v4 + GSAP/ScrollTrigger.

## Uruchomienie

```
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
```

## Struktura

```
app/                  strony, layout, style globalne, API formularza
components/           sekcje strony i elementy współdzielone
lib/content.ts        wszystkie treści i dane — jedno źródło prawdy
lib/gsap.ts           rejestracja GSAP, obsługa prefers-reduced-motion
media-source/         oryginały zdjęć i filmów od klienta (nieserwowane)
  ASSETS.md           manifest: plik → co przedstawia → sekcja → status
public/assets/bc-progres/
  img/                zoptymalizowane zdjęcia (maks. 1600 px)
  video/              hero: 1280p i 854p + plakat
```

## Formularz kontaktowy

Endpoint: `app/api/wycena/route.ts` (walidacja i antyspam w `intake.ts`,
wysyłka w `delivery.ts`, wspólne reguły z formularzem w `lib/lead.ts`).

Zgłoszenie trafia do webhooka Google Apps Script: wiersz w Google Sheets,
załączniki w folderze zgłoszenia na Google Drive. Bez konfiguracji endpoint
zwraca **503 `SERVICE_UNAVAILABLE`** i strona mówi wprost, że wiadomość nie
została wysłana. Zmienne środowiskowe (tylko serwer, wzór: `.env.example`):

```
GOOGLE_LEADS_WEBHOOK_URL=https://script.google.com/macros/s/.../exec
GOOGLE_LEADS_WEBHOOK_SECRET=...
```

Po udanym zapisie w Google wychodzi dodatkowe powiadomienie e-mail przez
Resend (`sendLeadEmail` w `delivery.ts`, szablon w `lead-email.ts`) na adres
z `CONTACT_TO`. To tylko powiadomienie: brak zmiennych `RESEND_API_KEY`,
`CONTACT_TO`, `CONTACT_FROM` albo błąd Resend nie zmienia wyniku formularza.

Przed zapisem zgłoszenie musi przejść Cloudflare Turnstile
(`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`). Weryfikacja działa
„fail closed”: bez tokenu, bez sekretu albo przy błędzie Siteverify API zwraca
`VERIFICATION_FAILED` i nie wywołuje Google ani Resend. Lokalnie można użyć
kluczy testowych Cloudflare (patrz `.env.example`).

Lokalnie `LEAD_DRY_RUN=1` pozwala przetestować formularz bez wywołania
integracji; w buildzie produkcyjnym ta zmienna jest ignorowana.

## Zasada treści

Na stronie nie ma wymyślonych danych: lat doświadczenia, liczby pracowników,
opinii, liczby realizacji, telefonu, e-maila ani certyfikatów. Jedyna
realizacja opisana z nazwy i daty to kontrakt MZWiK Nowy Targ, z linkiem do
źródła. Przypisanie zdjęć do konkretnych inwestycji wymaga potwierdzenia
przez klienta — patrz `media-source/ASSETS.md`.
