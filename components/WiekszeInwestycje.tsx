"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGsap, LINE_FROM, LINE_TO } from "@/lib/gsap";
import { contracts, wiekszeInwestycje } from "@/lib/content";
import { useWycena } from "@/components/wycena/WycenaProvider";

/**
 * Większe inwestycje.
 *
 * W tym miejscu stało wcześniej samo zdjęcie bez treści. Zdjęcie zostaje jako
 * tło, ale niesie teraz konkretny komunikat biznesowy: że firma pracuje także
 * przy większych realizacjach. Dowodem jest publicznie potwierdzony kontrakt,
 * a nie deklaracja — dlatego sekcja linkuje do źródła.
 */
export function WiekszeInwestycje() {
  const root = useRef<HTMLElement>(null);
  const { otworz } = useWycena();
  const kontrakt = contracts[0];

  useGsap(root, () => {
    gsap.fromTo(
      ".wi-img",
      { yPercent: -6, scale: 1.08 },
      {
        yPercent: 6,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );

    const tl = gsap.timeline({
      scrollTrigger: { trigger: root.current, start: "top 70%" },
    });
    tl.fromTo(
      ".wi-line",
      LINE_FROM(),
      { ...LINE_TO(), duration: 1.2, stagger: 0.08, ease: "expo.out" },
    )
      .fromTo(
        ".wi-fade",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.85, stagger: 0.07, ease: "expo.out" },
        0.25,
      );
  });

  return (
    <section
      ref={root}
      aria-label="Większe inwestycje"
      className="relative isolate overflow-hidden bg-graphite"
    >
      <div className="wi-img absolute inset-x-0 -top-[8%] -bottom-[8%] -z-10">
        <Image
          src="/assets/bc-progres/img/bud21.jpg"
          alt="Stalowy szkielet obiektu na tle nieba"
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(14,15,14,0.94)_0%,rgba(14,15,14,0.82)_45%,rgba(14,15,14,0.45)_100%)]"
      />

      <div className="gut py-[clamp(4rem,8vw,7rem)]">
        <div className="grid gap-x-8 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="wi-fade anim-hide eyebrow text-yellow">Zakres działania</p>

            <h2 className="mt-6 text-[clamp(1.8rem,5vw,3.5rem)] text-bone">
              <span className="line-mask">
                <span className="line-inner wi-line">Realizujemy także</span>
              </span>
              <span className="line-mask">
                <span className="line-inner wi-line">większe inwestycje.</span>
              </span>
            </h2>

            <p className="wi-fade anim-hide mt-7 max-w-[48ch] text-[1.0625rem] leading-relaxed text-bone/75">
              BC PROGRES wykonuje nie tylko budowę domów, ale również prace w
              ramach większych realizacji, inwestycji o wyższej wartości oraz
              wybranych prac związanych z przetargami.
            </p>

            <ul className="mt-10 grid gap-x-8 sm:grid-cols-2">
              {wiekszeInwestycje.map((p) => (
                <li
                  key={p.nr}
                  className="wi-fade anim-hide flex items-baseline gap-4 border-t border-[var(--rule-dark)] py-4"
                >
                  <span className="eyebrow shrink-0 tabular-nums text-yellow">
                    {p.nr}
                  </span>
                  <span className="text-[1rem] text-bone/90">{p.label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dowód, a nie deklaracja. */}
          <div className="wi-fade anim-hide lg:col-span-4 lg:col-start-9 lg:self-end">
            <div className="border border-[var(--rule-dark)] bg-ink/70 p-6 backdrop-blur-[2px]">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 shrink-0 bg-yellow" aria-hidden="true" />
                <p className="eyebrow text-yellow">{kontrakt.status}</p>
              </div>

              <p className="mt-5 text-[0.9375rem] leading-relaxed text-bone/85">
                {kontrakt.client}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-bone/55">
                {kontrakt.place}
              </p>
              <p className="mt-4 text-sm text-bone/55">
                Umowa {kontrakt.signed}, termin robót {kontrakt.deadline}.
              </p>

              <a
                href={kontrakt.source}
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-6 inline-flex items-center gap-3 text-sm text-bone/60 transition-colors hover:text-yellow"
              >
                <span className="border-b border-bone/25 pb-0.5 group-hover:border-yellow">
                  Źródło: {kontrakt.sourceLabel}
                </span>
                <svg viewBox="0 0 12 12" className="w-3" fill="none" aria-hidden="true">
                  <path d="M1 11L11 1M4 1h7v7" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </a>
            </div>

            <button
              type="button"
              onClick={() => otworz()}
              className="group mt-6 inline-flex w-full items-center justify-between gap-6 border border-bone/30 px-6 py-4 text-[12px] font-bold tracking-[0.16em] text-bone uppercase transition-colors duration-400 hover:border-yellow hover:bg-yellow hover:text-graphite"
            >
              Poproś o wycenę
              <svg
                viewBox="0 0 24 12"
                fill="none"
                className="w-5 transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:translate-x-1.5"
                aria-hidden="true"
              >
                <path d="M0 6h22M17 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
