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
public/assets/bc-progres/
  img/                zoptymalizowane zdjęcia (maks. 1600 px)
  video/              hero: 1280p i 854p + plakat
  ASSETS.md           manifest: plik → co przedstawia → sekcja → status
```

## Formularz kontaktowy

Endpoint: `app/api/kontakt/route.ts`.

Bez konfiguracji zwraca **501 `not_configured`** i strona mówi wprost, że
wiadomość nie została wysłana. Żeby go uruchomić, ustaw zmienne środowiskowe:

```
RESEND_API_KEY=re_...
CONTACT_TO=biuro@domena.pl
CONTACT_FROM=strona@domena.pl
```

Endpoint korzysta z REST API Resend przez `fetch` — nie wymaga dodatkowej
zależności. Zamiana na inny dostawca to podmiana jednego wywołania `fetch`.

## Zasada treści

Na stronie nie ma wymyślonych danych: lat doświadczenia, liczby pracowników,
opinii, liczby realizacji, telefonu, e-maila ani certyfikatów. Jedyna
realizacja opisana z nazwy i daty to kontrakt MZWiK Nowy Targ, z linkiem do
źródła. Przypisanie zdjęć do konkretnych inwestycji wymaga potwierdzenia
przez klienta — patrz `public/assets/bc-progres/ASSETS.md`.
