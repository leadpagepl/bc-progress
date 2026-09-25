import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { company } from "@/lib/content";

export const metadata: Metadata = {
  title: "Polityka prywatności",
  description:
    "Jakie dane zbiera strona BC PROGRES sp. z o.o. i co się z nimi dzieje.",
  robots: { index: true, follow: true },
};

/**
 * Dokument opisuje wyłącznie to, co strona faktycznie robi w obecnej wersji.
 * Wymaga finalnej akceptacji prawnej i biznesowej przed publikacją.
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

      <main className="gut py-[clamp(3rem,7vw,5.5rem)]">
        <p className="eyebrow text-grey">Dokument</p>
        <h1 className="mt-5 max-w-[16ch] text-[clamp(2.15rem,6vw,4.25rem)]">
          Polityka prywatności
        </h1>

        <div className="mt-8 border-l-2 border-yellow bg-bone-2 p-6">
          <p className="max-w-[70ch] text-sm leading-relaxed">
            <strong>Do zatwierdzenia.</strong> Dokument opisuje tylko te procesy,
            które strona realizuje w obecnej wersji. Przed publikacją wymaga
            sprawdzenia przez firmę, w razie potrzeby także przez prawnika,
            oraz uzupełnienia o dane kontaktowe administratora.
          </p>
        </div>

        <div className="mt-11 grid gap-x-8 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-8 lg:col-start-4">
            <Article title="Administrator danych">
              <p>
                Administratorem danych jest {company.name}, {company.address.line1},{" "}
                {company.address.line2}. KRS {company.krs}, NIP {company.nip},
                REGON {company.regon}.
              </p>
              <p className="text-grey">
                Adres e-mail i numer telefonu do kontaktu w sprawie danych
                zostaną uzupełnione po potwierdzeniu przez firmę.
              </p>
            </Article>

            <Article title="Jakie dane zbieramy">
              <p>
                Wyłącznie te, które podasz w formularzu wyceny: rodzaj
                inwestycji, miejscowość, opis inwestycji, imię, numer telefonu
                oraz adres e-mail, jeśli go wpiszesz.
              </p>
              <p>
                Jeśli dołączysz zdjęcia albo projekt, trafiają one razem z
                zapytaniem na skrzynkę firmy. Nie zapisujemy ich na serwerze
                strony i nie publikujemy ich nigdzie.
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
                Dostawcy hostingu strony oraz, po podłączeniu, dostawcy usługi
                poczty e-mail, który dostarcza wiadomość z formularza wraz z
                załącznikami do naszej skrzynki. Nie sprzedajemy danych i nie przekazujemy ich do celów
                marketingowych.
              </p>
              <p className="text-grey">
                Konkretni dostawcy zostaną wymienieni z nazwy po wyborze
                hostingu i skrzynki.
              </p>
            </Article>

            <Article title="Ciasteczka">
              <p>
                Strona nie zapisuje ciasteczek analitycznych ani marketingowych.
                Korzysta wyłącznie z technicznych mechanizmów niezbędnych do
                wyświetlenia treści.
              </p>
            </Article>

            <Article title="Twoje prawa">
              <p>
                Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia,
                ograniczenia przetwarzania, przenoszenia oraz sprzeciwu. Zgodę
                możesz wycofać w każdej chwili. Przysługuje Ci też skarga do
                Prezesa Urzędu Ochrony Danych Osobowych.
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
