"use client";

import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { company, nav } from "@/lib/content";
import { useWycena } from "@/components/wycena/WycenaProvider";
import { ScrollTrigger } from "@/lib/gsap";

export function Header() {
  const { otworz } = useWycena();
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);

  /* Nagłówek zmienia stan w miejscu, w którym kończy się hero. */
  useEffect(() => {
    const end = document.getElementById("hero-end");
    let frame = 0;

    const read = () => {
      frame = 0;
      const limit = end
        ? end.getBoundingClientRect().top + window.scrollY - 80
        : window.innerHeight - 80;
      setSolid(window.scrollY > limit);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /**
   * Blokada przewijania pod otwartym menu.
   *
   * Samo `overflow: hidden` nie wystarcza na iOS, więc przytrzymujemy stronę
   * przez `position: fixed` i po zamknięciu wracamy dokładnie na to samo
   * miejsce. ScrollTrigger dostaje potem `refresh()`, bo wysokość dokumentu
   * na moment się zmienia.
   */
  useEffect(() => {
    if (!open) return;
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
      /* `behavior: instant` jest tu konieczne: globalnie mamy
         `scroll-behavior: smooth`, więc zwykłe scrollTo animowałoby powrót,
         a refresh() przerywałby tę animację i strona zostawała na górze. */
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
  }, [open]);

  /* Escape zamyka menu. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* Powrót na desktop przy otwartym menu nie może zostawić blokady. */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const dark = solid || open;

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-500",
        dark
          ? "border-b border-[var(--rule-dark)] bg-graphite"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className={[
          "gut flex items-center justify-between transition-[height] duration-500",
          dark ? "h-[64px] lg:h-[68px]" : "h-[72px] lg:h-[88px]",
        ].join(" ")}
      >
        <a
          href="#gora"
          aria-label="Strona główna BC PROGRES"
          className="relative z-10 block shrink-0"
          onClick={() => setOpen(false)}
        >
          <Logo
            tone="light"
            className={[
              "w-[150px] transition-[width] duration-500 sm:w-[190px]",
              dark ? "" : "lg:w-[214px]",
            ].join(" ")}
          />
        </a>

        <nav className="hidden items-center gap-9 lg:flex" aria-label="Główna">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group relative py-2 text-[13px] font-medium tracking-[0.14em] text-bone/85 uppercase transition-colors hover:text-bone"
            >
              {item.label}
              <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-yellow transition-[width] duration-400 ease-[var(--ease-out-quint)] group-hover:w-full" />
            </a>
          ))}
          <button
            type="button"
            onClick={() => otworz()}
            className="bg-yellow px-6 py-3.5 text-[12px] font-bold tracking-[0.16em] text-graphite uppercase transition-transform duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-0.5"
          >
            Poproś o wycenę
          </button>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-mobilne"
          className="relative z-10 -mr-3 flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-[7px] lg:hidden"
        >
          <span className="sr-only">{open ? "Zamknij menu" : "Otwórz menu"}</span>
          <span
            className={[
              "block h-[2px] w-7 bg-bone transition-transform duration-300",
              open ? "translate-y-[4.5px] rotate-45" : "",
            ].join(" ")}
          />
          <span
            className={[
              "block h-[2px] w-7 bg-bone transition-transform duration-300",
              open ? "-translate-y-[4.5px] -rotate-45" : "",
            ].join(" ")}
          />
        </button>
      </div>

      {/* Menu mobilne. `hidden` gdy zamknięte, więc nic nie zasłania strony. */}
      <div
        id="menu-mobilne"
        hidden={!open}
        className="gut fixed inset-x-0 top-[64px] bottom-0 z-40 flex flex-col justify-between overflow-y-auto bg-graphite pt-8 lg:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.75rem)" }}
      >
        <nav className="flex flex-col" aria-label="Mobilna">
          {nav.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="spine-dark flex items-baseline justify-between gap-4 py-[clamp(1rem,3.4vw,1.35rem)] font-display text-[clamp(1.75rem,8.5vw,2.5rem)] font-extrabold tracking-[-0.03em] text-bone uppercase"
            >
              {item.label}
              <span className="eyebrow shrink-0 text-yellow">
                {String(i + 1).padStart(2, "0")}
              </span>
            </a>
          ))}
        </nav>

        {/* Dane z rejestru, żeby dolna część menu niosła treść, a nie pustkę. */}
        <div className="mt-10">
          <p className="eyebrow text-bone/40">Siedziba</p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-bone/70">
            {company.address.line1}
            <br />
            {company.address.line2}
          </p>
          <div className="mt-5 flex gap-5">
            <a
              href={company.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.9375rem] text-bone/70 transition-colors hover:text-yellow"
            >
              Instagram
            </a>
            <a
              href={company.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[0.9375rem] text-bone/70 transition-colors hover:text-yellow"
            >
              Facebook
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            otworz();
          }}
          className="mt-8 flex w-full items-center justify-between gap-6 bg-yellow px-6 py-5 text-[13px] font-bold tracking-[0.16em] text-graphite uppercase"
        >
          Poproś o wycenę
          <svg viewBox="0 0 24 12" fill="none" className="w-5" aria-hidden="true">
            <path d="M0 6h22M17 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>
    </header>
  );
}
