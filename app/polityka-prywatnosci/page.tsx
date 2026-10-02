import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { company } from "@/lib/content";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description:
    "Jakie dane zbiera strona BC PROGRES sp. z o.o. i co się z nimi dzieje.",
  alternates: { canonical: "/polityka-prywatnosci" },
  robots: { index: true, follow: true },
};

/**
 * Dokument opisuje wyłącznie to, co strona faktycznie robi w obecnej wersji:
 * formularz wyceny (app/api/wycena), Turnstile i osadzoną mapę. Zmiana
 * którejkolwiek z tych integracji wymaga aktualizacji tej strony.
 * Treść nie była weryfikowana przez prawnika.
 */
export default function Polityka() {
  return (
    <>
      <header className="bg-graphite">
        <div className="gut flex h-[68px] items-center justify-between">
          <Link href="/" aria-label="Strona główna BC PROGRES">
            <Logo tone="light" className="w-[180px]" />
          </Link>
          <Link
            href="/"
            className="text-[12px] font-semibold tracking-[0.14em] text-bone/80 uppercase transition-colors hover:text-yellow"
          >
            Wróć
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="gut py-[clamp(3rem,7vw,5.5rem)] outline-none"
      >
        <p className="eyebrow text-grey">Dokument</p>
        <h1 className="mt-5 max-w-[16ch] text-[clamp(2.15rem,6vw,4.25rem)]">
          Polityka prywatności
        </h1>

        <div className="mt-11 grid gap-x-8 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-8 lg:col-start-4">
            <Article title="Administrator danych">
              <p>
                Administratorem danych jest {company.name}, {company.address.line1},{" "}
                {company.address.line2}. KRS {company.krs}, NIP {company.nip},
                REGON {company.regon}.
              </p>
              <p>
                W sprawach dotyczących danych osobowych możesz skontaktować
                się z {company.shortName} pod numerem{" "}
                <a
                  href={`tel:${company.phone.replace(/\s/g, "")}`}
                  className="border-b border-graphite/35 pb-0.5 whitespace-nowrap transition-colors hover:border-yellow"
                >
                  {company.phone}
                </a>{" "}
                lub pisemnie na adres siedziby spółki.
              </p>
            </Article>

            <Article title="Jakie dane zbieramy">
              <p>
                Te, które podasz w formularzu wyceny: rodzaj inwestycji,
                miejscowość, opis inwestycji, imię, numer telefonu oraz adres
                e-mail, jeśli go wpiszesz. Jeśli otwierasz formularz przy
                konkretnej realizacji, zapisujemy też jej nazwę. Do zapytania
                dodajemy datę i godzinę wysłania.
              </p>
              <p>
                Jeśli dołączysz zdjęcia albo projekt, trafiają one do firmy
                razem z zapytaniem: są zapisywane w folderze zgłoszenia na
                Dysku Google i dołączane do wiadomości e-mail z powiadomieniem.
                Nie zapisujemy ich na serwerze strony i nigdzie ich nie
                publikujemy.
              </p>
              <p>
                Przy wysyłaniu formularza przetwarzane są też dane techniczne:
                adres IP oraz informacje o przeglądarce i urządzeniu potrzebne
                do sprawdzenia, czy formularza nie wysyła automat, a także
                techniczny identyfikator zgłoszenia, dzięki któremu to samo
                zapytanie nie zapisze się dwa razy. Adresu IP nie zapisujemy
                razem z zapytaniem.
              </p>
              <p>
                Podanie danych jest dobrowolne, ale bez pól oznaczonych jako
                wymagane formularz nie zostanie wysłany.
              </p>
              <p>
                Strona nie korzysta z narzędzi analitycznych, nie wyświetla
                reklam i nie profiluje użytkowników.
              </p>
            </Article>

            <Article title="Po co ich używamy">
              <p>
                Żeby odpowiedzieć na zapytanie i przygotować wycenę. Podstawą
                jest Twoja zgoda oraz nasz uzasadniony interes w prowadzeniu
                korespondencji handlowej.
              </p>
              <p>
                Dane techniczne, m.in. adres IP, służą wyłącznie ochronie
                strony i formularza przed botami i nadużyciami — w tym
                weryfikacji Cloudflare Turnstile i ograniczaniu liczby
                zgłoszeń. Podstawą jest nasz uzasadniony interes w ochronie
                strony i formularza przed nadużyciami oraz w zapewnieniu ich
                bezpieczeństwa.
              </p>
            </Article>

            <Article title="Jak długo je przechowujemy">
              <p>
                Do czasu zakończenia rozmowy o inwestycji, a następnie przez
                okres wymagany przepisami albo do momentu, w którym poprosisz
                o ich usunięcie.
              </p>
            </Article>

            <Article title="Komu je przekazujemy">
              <p>
                Zapytania otrzymuje i obsługuje {company.shortName}. Stronę,
                formularz oraz infrastrukturę techniczną, w której zapytania
                są przetwarzane i przechowywane, utrzymuje w imieniu{" "}
                {company.shortName} Leadpage (leadpage.pl), marka prowadzona
                przez Łukasza Czubera, osobę fizyczną.
              </p>
              <p>
                Dane trafiają też do dostawców usług, z których korzysta
                strona, tylko w zakresie potrzebnym do działania danej usługi:
              </p>
              <ul className="flex flex-col gap-3">
                <li>
                  <strong>Vercel</strong> — hosting strony i obsługa formularza
                  po stronie serwera.
                </li>
                <li>
                  <strong>Cloudflare (usługa Turnstile)</strong> — sprawdzenie,
                  czy formularza nie wysyła automat. Cloudflare otrzymuje w tym
                  celu dane techniczne, m.in. adres IP oraz informacje o
                  przeglądarce i urządzeniu. Nie otrzymuje treści zapytania.
                </li>
                <li>
                  <strong>Google (Apps Script, Arkusze Google, Dysk Google)</strong>{" "}
                  — przyjęcie i przechowywanie zapytań. Dane z formularza są
                  zapisywane w arkuszu, a załączniki w folderze na Dysku
                  Google. Dostęp do arkusza i folderu mają tylko upoważnione
                  osoby z {company.shortName} oraz, w zakresie potrzebnym do
                  utrzymania usługi, Leadpage i upoważnione osoby
                  współpracujące z Leadpage.
                </li>
                <li>
                  <strong>Resend</strong> — dostarczenie na skrzynkę firmy
                  wiadomości e-mail z powiadomieniem o nowym zapytaniu, wraz
                  z jego treścią i załącznikami.
                </li>
                <li>
                  <strong>Google (Mapy Google)</strong> — mapa dojazdu
                  osadzona na stronie głównej. Gdy mapa się wczytuje, Twoja
                  przeglądarka łączy się z serwerami Google, które otrzymują
                  m.in. adres IP.
                </li>
              </ul>
              <p>
                Nie sprzedajemy danych i nie przekazujemy ich do celów
                marketingowych.
              </p>
            </Article>

            <Article title="Przekazywanie danych poza EOG">
              <p>
                Część dostawców technologicznych, z których korzysta strona,
                może przetwarzać dane poza Europejskim Obszarem Gospodarczym.
              </p>
              <p>
                Jeżeli w związku z korzystaniem z usług dostawców
                technologicznych dochodzi do przekazania danych poza
                Europejski Obszar Gospodarczy, odbywa się ono z zastosowaniem
                mechanizmów przewidzianych przez RODO, odpowiednich dla danego
                dostawcy, takich jak decyzja stwierdzająca odpowiedni stopień
                ochrony lub standardowe klauzule umowne.
              </p>
            </Article>

            <Article title="Ciasteczka">
              <p>
                Sama strona nie zapisuje ciasteczek analitycznych ani
                marketingowych.
              </p>
              <p>
                Dwa elementy pochodzą od zewnętrznych dostawców i działają we
                własnych ramkach: mapa Google na stronie głównej oraz
                zabezpieczenie Cloudflare Turnstile w formularzu wyceny. Mogą
                one zapisywać własne pliki cookie lub korzystać z pamięci
                przeglądarki na zasadach tych dostawców.
              </p>
            </Article>

            <Article title="Twoje prawa">
              <p>
                Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia,
                ograniczenia przetwarzania, przenoszenia oraz sprzeciwu. Zgodę
                możesz wycofać w każdej chwili. Przysługuje Ci też skarga do
                Prezesa Urzędu Ochrony Danych Osobowych.
              </p>
              <p>
                Żeby skorzystać z tych praw, skontaktuj się z nami w sposób
                podany w części „Administrator danych”.
              </p>
            </Article>

            <Article title="Linki zewnętrzne">
              <p>
                Ze strony prowadzą odnośniki do profili na Instagramie i
                Facebooku oraz do serwisów, które potwierdzają nasze dane
                rejestrowe i kontrakty. Po przejściu obowiązują zasady tych
                serwisów.
              </p>
            </Article>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function Article({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="spine py-7 first:border-t-0 first:pt-0">
      <h2 className="text-[clamp(1.25rem,2.6vw,1.75rem)]">{title}</h2>
      <div className="mt-5 flex max-w-[64ch] flex-col gap-4 text-[1rem] leading-relaxed">
        {children}
      </div>
    </section>
  );
}
