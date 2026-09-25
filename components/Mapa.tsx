"use client";

import { useEffect, useRef, useState } from "react";
import { company, mapEmbedUrl, mapLinkUrl } from "@/lib/content";
import { useWycena } from "@/components/wycena/WycenaProvider";
import { Reveal } from "./Section";

/**
 * Mapa dojazdu.
 *
 * Osadzamy adres rejestrowy, a nie wizytówkę firmy — spółka nie ma
 * zweryfikowanego profilu Google, więc pinezka nie jest opisywana jako biuro.
 *
 * Iframe montuje się dopiero, gdy sekcja zbliży się do ekranu, a do pierwszego
 * kliknięcia przykrywa go warstwa przejmująca wskaźnik. Dzięki temu kółko
 * myszy nad mapą przewija stronę, a nie zoomuje mapę — i nie trzeba do tego
 * blokować zdarzeń.
 */
export function Mapa() {
  const { otworz } = useWycena();
  const root = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      aria-label="Lokalizacja"
      className="gut py-[clamp(4rem,7.5vw,6.25rem)]"
    >
      <div className="spine" />

      <div
        ref={root}
        className="grid gap-x-8 gap-y-8 pt-[clamp(1.5rem,3vw,2.25rem)] lg:grid-cols-12"
      >
        {/* Mapa */}
        <Reveal className="lg:col-span-6">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-bone-2 sm:aspect-[16/9]">
            {inView && (
              <iframe
                src={mapEmbedUrl}
                title="Mapa dojazdu, os. Równie 2, 34-452 Ochotnica Dolna"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            )}

            {!interactive && (
              <button
                type="button"
                onClick={() => setInteractive(true)}
                /* Etykieta stoi w prawym górnym rogu, żeby nie zasłaniać
                   logotypu i not prawnych Google w dolnym pasie mapy. */
                className="absolute inset-0 flex items-start justify-end bg-graphite/0 p-4 transition-colors hover:bg-graphite/5"
              >
                <span className="bg-graphite/85 px-3.5 py-2.5 text-[11px] font-semibold tracking-[0.16em] text-bone uppercase">
                  Aktywuj mapę
                </span>
              </button>
            )}
          </div>
        </Reveal>

        {/* Adres i przyciski */}
        <Reveal className="lg:col-span-5 lg:col-start-8 lg:self-center" delay={0.1}>
          <p className="eyebrow text-grey">Lokalizacja</p>

          <h2 className="mt-5 text-[clamp(1.75rem,4vw,2.6rem)]">
            Ochotnica Dolna.
          </h2>

          <address className="mt-6 text-[1.0625rem] leading-relaxed not-italic">
            <span className="font-semibold">{company.shortName}</span>
            <br />
            {company.address.line1}
            <br />
            {company.address.line2}
          </address>

          <p className="mt-3 text-sm text-grey">
            Adres rejestrowy spółki.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-col">
            <a
              href={mapLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-between gap-6 bg-yellow px-6 py-3.5 text-[12px] font-bold tracking-[0.16em] text-graphite uppercase transition-transform duration-400 ease-[var(--ease-out-quint)] hover:-translate-y-0.5"
            >
              Otwórz w Google Maps
              <ExternalArrow />
            </a>
            <button
              type="button"
              onClick={() => otworz()}
              className="group inline-flex items-center justify-between gap-6 border border-graphite/25 px-6 py-3.5 text-[12px] font-bold tracking-[0.16em] text-graphite uppercase transition-colors duration-400 hover:border-graphite hover:bg-graphite hover:text-bone"
            >
              Poproś o wycenę
              <ExternalArrow />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function ExternalArrow() {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      className="w-3 transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      aria-hidden="true"
    >
      <path d="M1 11L11 1M4 1h7v7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
