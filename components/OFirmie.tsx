import Image from "next/image";
import { SectionHead, Reveal } from "./Section";
import { company, contracts } from "@/lib/content";

export function OFirmie() {
  return (
    <section id="o-firmie" className="gut scroll-mt-20 py-[clamp(4rem,7.5vw,6.25rem)]">
      <SectionHead
        label="O firmie"
        lines={["Poznaj", "BC Progres."]}
        lead={
          <>
            Spółka z siedzibą w Ochotnicy Dolnej. Budujemy domy i obiekty,
            prowadzimy roboty budowlane i prace ziemne.
          </>
        }
      />

      <div className="mt-[clamp(2rem,4vw,3rem)] grid gap-x-8 gap-y-10 lg:grid-cols-12">
        {/* Dane rejestrowe */}
        <Reveal className="lg:col-span-5">
          <p className="eyebrow text-grey">Dane rejestrowe</p>
          <dl className="mt-6">
            {[
              ["Nazwa", company.name],
              ["KRS", company.krs],
              ["NIP", company.nip],
              ["REGON", company.regon],
              ["Rejestracja", company.registered],
              ["Siedziba", `${company.address.line1}, ${company.address.line2}`],
            ].map(([k, v]) => (
              <div key={k} className="spine flex flex-wrap items-baseline gap-x-6 py-3.5">
                <dt className="eyebrow w-28 shrink-0 text-grey">{k}</dt>
                <dd className="flex-1 text-[0.9375rem] tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="spine" />
          <a
            href={company.krsSource}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-5 inline-flex items-center gap-3 text-sm text-grey transition-colors hover:text-graphite"
          >
            <span className="border-b border-grey/40 pb-0.5 group-hover:border-graphite">
              Sprawdź wpis w rejestrze
            </span>
            <svg viewBox="0 0 12 12" className="w-3" fill="none" aria-hidden="true">
              <path d="M1 11L11 1M4 1h7v7" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </a>
        </Reveal>

        {/* Zdjęcie tylko na telefonie: rozbija blok danych i daje sekcji
            oddech tam, gdzie kolumny układają się jedna pod drugą. */}
        <Reveal className="lg:hidden" delay={0.05}>
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-bone-2">
            <Image
              src="/assets/bc-progres/img/bud5.jpg"
              alt="Hak dźwigu i koparka na placu budowy"
              fill
              /* Kadr istnieje tylko poniżej `lg`, więc desktop nie ma po co
                 pobierać dużego pliku. */
              sizes="(min-width: 1024px) 1px, 100vw"
              className="object-cover object-center"
            />
          </div>
        </Reveal>

        {/* Kontrakty potwierdzone publicznie */}
        <Reveal className="lg:col-span-6 lg:col-start-7" delay={0.1}>
          <p className="eyebrow text-grey">Kontrakty publiczne</p>

          {contracts.map((c) => (
            <article key={c.name} className="mt-6 bg-graphite p-[clamp(1.25rem,3vw,2.25rem)] text-bone">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 shrink-0 bg-yellow" aria-hidden="true" />
                <p className="eyebrow text-yellow">{c.status}</p>
              </div>

              <h3 className="mt-5 text-[clamp(1.1rem,2vw,1.5rem)] leading-[1.15] normal-case tracking-[-0.02em]">
                {c.name}
              </h3>

              <dl className="mt-7">
                {[
                  ["Zamawiający", c.client],
                  ["Miejsce", c.place],
                  ["Umowa", c.signed],
                  ["Termin robót", c.deadline],
                ].map(([k, v]) => (
                  <div key={k} className="spine-dark flex flex-wrap items-baseline gap-x-6 py-3">
                    <dt className="eyebrow w-32 shrink-0 text-bone/45">{k}</dt>
                    <dd className="flex-1 text-[0.9375rem] text-bone/90">{v}</dd>
                  </div>
                ))}
              </dl>

              <a
                href={c.source}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-6 inline-flex items-center gap-3 text-sm text-bone/60 transition-colors hover:text-yellow"
              >
                <span className="border-b border-bone/25 pb-0.5 group-hover:border-yellow">
                  Źródło: {c.sourceLabel}
                </span>
                <svg viewBox="0 0 12 12" className="w-3" fill="none" aria-hidden="true">
                  <path d="M1 11L11 1M4 1h7v7" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </a>
            </article>
          ))}

          <p className="mt-5 max-w-[54ch] text-sm leading-relaxed text-grey">
            Podpisanie umowy nie oznacza zakończenia robót. Status każdego
            zadania podajemy zgodnie ze źródłem.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
