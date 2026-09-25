"use client";

import { useRef } from "react";
import { gsap, useGsap, LINE_FROM, LINE_TO } from "@/lib/gsap";
import { company } from "@/lib/content";
import { useWycena } from "@/components/wycena/WycenaProvider";

/**
 * Zamknięcie strony.
 *
 * Formularz mieszka w modalu, więc tutaj zostaje samo zaproszenie
 * i potwierdzone dane kontaktowe. Nie dublujemy zapytania w dwóch miejscach.
 */
export function Kontakt() {
  const { otworz } = useWycena();
  const root = useRef<HTMLElement>(null);

  useGsap(root, () => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: root.current, start: "top 72%" },
    });
    tl.fromTo(
      ".kon-line",
      LINE_FROM(),
      { ...LINE_TO(), duration: 1.3, stagger: 0.09, ease: "expo.out" },
    )
      .fromTo(".kon-rule", { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "expo.out" }, 0.2)
      .fromTo(
        ".kon-fade",
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.9, stagger: 0.06, ease: "expo.out" },
        0.35,
      );
  });

  return (
    <section id="kontakt" ref={root} className="scroll-mt-20 bg-ink text-bone">
      <div className="gut py-[clamp(4rem,7.5vw,6.25rem)]">
        <div className="kon-rule h-px origin-left bg-[var(--rule-dark)]" />

        <div className="pt-8">
          <p className="kon-fade anim-hide eyebrow text-yellow">Kontakt</p>
          <h2 className="mt-6 text-[clamp(1.75rem,8vw,4.5rem)] text-bone">
            <span className="line-mask">
              <span className="line-inner kon-line">Masz projekt?</span>
            </span>
            <span className="line-mask">
              <span className="line-inner kon-line">Porozmawiajmy.</span>
            </span>
          </h2>
        </div>

        <div className="mt-[clamp(2rem,4vw,3rem)] grid gap-x-8 gap-y-[clamp(2.25rem,5vw,3.5rem)] lg:grid-cols-12">
          {/* Zaproszenie do wyceny */}
          <div className="kon-fade anim-hide lg:col-span-6">
            <p className="max-w-[40ch] text-[1.0625rem] leading-relaxed text-bone/75">
              Opowiedz nam krótko o swojej inwestycji. Odezwiemy się i ustalimy
              zakres prac.
            </p>

            <button
              type="button"
              onClick={() => otworz()}
              className="group mt-8 inline-flex w-full items-center justify-between gap-6 bg-yellow px-7 py-5 text-[13px] font-bold tracking-[0.16em] text-graphite uppercase transition-transform duration-400 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 sm:w-auto"
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

            <p className="mt-5 text-sm text-bone/45">
              Wypełnienie zajmuje około minuty.
            </p>
          </div>

          {/* Dane */}
          <div className="lg:col-span-5 lg:col-start-8">
            <div className="kon-fade anim-hide">
              <p className="eyebrow text-bone/45">Adres</p>
              <p className="mt-4 text-[1.0625rem] leading-relaxed">
                {company.name}
                <br />
                {company.address.line1}
                <br />
                {company.address.line2}
              </p>
            </div>

            <div className="kon-fade anim-hide mt-8">
              <p className="eyebrow text-bone/45">Znajdź nas</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Social href={company.instagram} label="Instagram" />
                <Social href={company.facebook} label="Facebook" />
              </div>
            </div>

            <p className="kon-fade anim-hide mt-8 max-w-[40ch] text-sm leading-relaxed text-bone/50">
              Numeru telefonu i adresu e-mail nie publikujemy, dopóki nie
              potwierdzi ich firma.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Social({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 border border-bone/25 px-5 py-3 text-[12px] font-semibold tracking-[0.14em] uppercase transition-colors hover:border-yellow hover:bg-yellow hover:text-graphite"
    >
      {label}
      <svg viewBox="0 0 12 12" className="w-2.5" fill="none" aria-hidden="true">
        <path d="M1 11L11 1M4 1h7v7" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </a>
  );
}
