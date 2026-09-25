"use client";

import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { gsap, ScrollTrigger, reducedMotion } from "@/lib/gsap";
import { Logo } from "@/components/Logo";
import { WycenaForm } from "./WycenaForm";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function WycenaModal({
  otwarty,
  realizacja,
  onClose,
}: {
  otwarty: boolean;
  realizacja?: string;
  onClose: () => void;
}) {
  const backdrop = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  /* Wejście: tło się wypełnia, panel podjeżdża. Zamknięcie odwraca ruch,
     a dopiero po nim znika z drzewa (obsługuje to rodzic przez `otwarty`). */
  useEffect(() => {
    if (!otwarty) return;
    if (reducedMotion()) return;
    const tl = gsap.timeline();
    tl.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" })
      .fromTo(
        panel.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" },
        0.05,
      );
    return () => {
      tl.kill();
    };
  }, [otwarty]);

  /**
   * Blokada tła. Ten sam wzorzec co w menu mobilnym: `position: fixed`
   * zatrzymuje stronę także na iOS, a po zamknięciu wracamy dokładnie tam,
   * gdzie użytkownik był. ScrollTrigger dostaje refresh, bo wysokość
   * dokumentu na moment się zmienia.
   */
  useEffect(() => {
    if (!otwarty) return;
    const y = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.overflow = prev.overflow;
      /* `instant`, bo globalnie działa `scroll-behavior: smooth` i zwykłe
         scrollTo animowałoby powrót, a refresh() by tę animację przerwał. */
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
  }, [otwarty]);

  /* Escape zamyka, Tab krąży wewnątrz panelu. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;

      const pola = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );
      if (!pola.length) return;
      const pierwsze = pola[0];
      const ostatnie = pola[pola.length - 1];

      if (e.shiftKey && document.activeElement === pierwsze) {
        e.preventDefault();
        ostatnie.focus();
      } else if (!e.shiftKey && document.activeElement === ostatnie) {
        e.preventDefault();
        pierwsze.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!otwarty) return;
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [otwarty, onKeyDown]);

  /* Po otwarciu fokus ląduje na pierwszym widocznym elemencie panelu, czyli
     na przycisku zamknięcia. Szukamy go dynamicznie, bo wersja mobilna i
     desktopowa mają osobne przyciski i tylko jedna jest w danym momencie
     wyrenderowana. */
  useEffect(() => {
    if (!otwarty) return;
    const t = setTimeout(() => {
      const pierwsze = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])]
        .find((el) => el.offsetParent !== null);
      (pierwsze ?? panel.current)?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [otwarty]);

  if (!otwarty) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-stretch justify-center lg:items-center lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Zapytanie o wycenę"
    >
      <div
        ref={backdrop}
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/75"
      />

      <div
        ref={panel}
        tabIndex={-1}
        className="relative flex w-full flex-col bg-bone outline-none lg:max-h-[min(92svh,54rem)] lg:w-full lg:max-w-[68rem] lg:flex-row"
      >
        {/* Kadr. Na telefonie zbędny, więc go nie ma. */}
        <div className="relative hidden shrink-0 overflow-hidden bg-graphite lg:block lg:w-[38%]">
          <Image
            src="/assets/bc-progres/img/bud4.jpg"
            alt="Koparka i dźwig przy fundamentach budynku"
            fill
            sizes="(min-width:1024px) 26vw, 0px"
            className="object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(14,15,14,0.9),rgba(14,15,14,0.3)_55%,rgba(14,15,14,0.55))]"
          />
          <div className="relative flex h-full flex-col justify-between p-8">
            <Logo tone="light" className="w-[180px]" />
            <div>
              <p className="eyebrow text-yellow">Twoja inwestycja</p>
              <p className="mt-4 font-display text-[2rem] leading-[0.95] font-extrabold tracking-[-0.035em] text-bone uppercase">
                Porozmawiajmy
                <br />o&nbsp;budowie.
              </p>
            </div>
          </div>
        </div>

        {/* Pasek na telefonie: logo i zamknięcie zawsze pod ręką. */}
        <div className="flex shrink-0 items-center justify-between gap-4 bg-graphite px-5 py-4 lg:hidden">
          <Logo tone="light" className="w-[140px]" />
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-bone"
          >
            <span className="sr-only">Zamknij</span>
            <svg viewBox="0 0 16 16" className="w-4" aria-hidden="true">
              <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>

        {/* Formularz */}
        <div
          data-wy-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-8 sm:px-8 lg:px-12 lg:py-12"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
        >
          <div className="mx-auto w-full max-w-[34rem]">
            <div className="mb-8 hidden items-start justify-between gap-6 lg:flex">
              <div>
                <h2 className="text-[clamp(1.5rem,2.4vw,2rem)]">Poproś o wycenę</h2>
                <p className="mt-3 max-w-[38ch] text-[0.9375rem] text-grey">
                  Napisz, czego potrzebujesz. Odezwiemy się do Ciebie w sprawie
                  wyceny.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mt-1 flex h-11 w-11 shrink-0 items-center justify-center border border-graphite/20 transition-colors hover:border-graphite hover:bg-graphite hover:text-bone"
              >
                <span className="sr-only">Zamknij</span>
                <svg viewBox="0 0 16 16" className="w-4" aria-hidden="true">
                  <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>

            <div className="mb-7 lg:hidden">
              <h2 className="text-[clamp(1.5rem,6vw,1.9rem)]">Poproś o wycenę</h2>
              <p className="mt-3 text-[0.9375rem] text-grey">
                Napisz, czego potrzebujesz. Odezwiemy się do Ciebie w sprawie
                wyceny.
              </p>
            </div>

            <WycenaForm realizacja={realizacja} />
          </div>
        </div>
      </div>
    </div>
  );
}
