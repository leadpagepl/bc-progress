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

Integracja Resend (`sendLeadEmail` w `delivery.ts`) jest w kodzie, ale na tym
etapie niewłączona — formularz nie wymaga zmiennych Resend.

Lokalnie `LEAD_DRY_RUN=1` pozwala przetestować formularz bez wywołania
integracji; w buildzie produkcyjnym ta zmienna jest ignorowana.

## Zasada treści

Na stronie nie ma wymyślonych danych: lat doświadczenia, liczby pracowników,
opinii, liczby realizacji, telefonu, e-maila ani certyfikatów. Jedyna
realizacja opisana z nazwy i daty to kontrakt MZWiK Nowy Targ, z linkiem do
źródła. Przypisanie zdjęć do konkretnych inwestycji wymaga potwierdzenia
przez klienta — patrz `media-source/ASSETS.md`.
