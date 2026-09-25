"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGsap } from "@/lib/gsap";
import { Logo } from "@/components/Logo";

/** Ekran po faktycznie udanej wysyłce. Nie pojawia się w żadnym innym stanie. */
export function Dziekujemy() {
  const root = useRef<HTMLDivElement>(null);

  useGsap(root, () => {
    gsap
      .timeline({ defaults: { ease: "expo.out" } })
      .fromTo(".dz-znak", { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8 })
      .to(".dz-in", { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.25);
  });

  return (
    <div
      ref={root}
      className="flex min-h-[100svh] flex-col items-center justify-center bg-bone"
    >
      <div className="gut mx-auto w-full max-w-[36rem] py-16 text-center">
        <Link
          href="/"
          aria-label="Strona główna BC PROGRES"
          className="dz-in mx-auto block w-[170px] opacity-0"
          style={{ transform: "translateY(12px)" }}
        >
          <Logo tone="dark" />
        </Link>

        <div
          className="dz-znak mx-auto mt-12 flex h-20 w-20 items-center justify-center bg-yellow opacity-0"
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 32" className="w-10" fill="none">
            <path
              className="dz-ptaszek"
              d="M7 16.8l6 6L25 10"
              stroke="#191A19"
              strokeWidth="3"
              strokeLinecap="square"
            />
          </svg>
        </div>

        <h1
          className="dz-in mt-10 text-[clamp(1.75rem,5vw,3rem)] opacity-0"
          style={{ transform: "translateY(12px)" }}
        >
          Dziękujemy za wiadomość.
        </h1>

        <p
          className="dz-in mx-auto mt-5 max-w-[34ch] text-[1.0625rem] leading-relaxed text-grey opacity-0"
          style={{ transform: "translateY(12px)" }}
        >
          Otrzymaliśmy Twoje zapytanie. Skontaktujemy się z Tobą.
        </p>

        <Link
          href="/"
          className="dz-in group mt-10 inline-flex items-center justify-between gap-6 bg-graphite px-7 py-5 text-[12px] font-bold tracking-[0.16em] text-bone uppercase opacity-0 transition-colors duration-300 hover:bg-yellow hover:text-graphite"
          style={{ transform: "translateY(12px)" }}
        >
          Wróć na stronę
          <svg viewBox="0 0 24 12" fill="none" className="w-5 transition-transform duration-400 ease-[var(--ease-out-quint)] group-hover:translate-x-1.5" aria-hidden="true">
            <path d="M0 6h22M17 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
