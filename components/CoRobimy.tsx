"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGsap, reducedMotion } from "@/lib/gsap";
import { works } from "@/lib/content";
import { blurFor } from "@/lib/blur";

/**
 * Zakres prac — przypięta sekwencja.
 *
 * Sekcja zatrzymuje się pod nagłówkiem, a dalsze przewijanie przesuwa tylko
 * aktywną pozycję. Trasa dzieli się na `works.length + 1` rozdziałów: osiem
 * dla usług i jeden dodatkowy na końcu, żeby ostatnie zdjęcie zostało na
 * ekranie tak samo długo jak poprzednie.
 *
 * Stanem steruje jedna scrubowana oś czasu GSAP, a nie stan Reacta.
 * Pierwsza wersja liczyła indeks w `onUpdate` zwykłego wyzwalacza i to był
 * błąd: bez `scrub` callback odpalał się dwa razy na całą trasę, więc numery
 * przeskakiwały po kilka naraz. Przy `scrub` playhead jest przypięty do
 * pozycji przewijania klatka po klatce, przewijanie w tył odtwarza kolejność
 * dokładnie odwrotnie, a React nie przerysowuje się ani razu.
 */

const ROZDZIAL_DESKTOP = 0.5;
const ROZDZIAL_MOBILE = 0.45;
/** Długość przenikania w jednostkach osi czasu (1 jednostka = 1 rozdział). */
const PRZENIKANIE = 0.22;

const NIEAKTYWNY = "rgba(25, 26, 25, 0.35)";
const AKTYWNY = "rgb(25, 26, 25)";

export function CoRobimy() {
  const root = useRef<HTMLElement>(null);
  const os = useRef<gsap.core.Timeline | null>(null);
  const bezRuchu = typeof window !== "undefined" && reducedMotion();

  useGsap(root, () => {
    if (reducedMotion()) return;
    const el = root.current;
    if (!el) return;

    const rozdzialy = works.length + 1;
    const ostatni = works.length - 1;

    /* Wysokość nagłówka w stanie zwartym — w takim właśnie jest, kiedy
       sekcja jest przypięta. Mierzenie go przy odświeżeniu dawało 88 px
       (stan nad hero) i zostawiało lukę pod paskiem. Te same wartości ma
       wysokość sekcji niżej, więc kadr wypełnia ekran co do piksela. */
    const wysokoscNaglowka = () =>
      window.matchMedia("(min-width: 1024px)").matches ? 68 : 64;

    const dlugoscRozdzialu = () =>
      Math.round(
        window.innerHeight *
          (window.matchMedia("(min-width: 1024px)").matches
            ? ROZDZIAL_DESKTOP
            : ROZDZIAL_MOBILE),
      );

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: el,
        start: () => `top ${wysokoscNaglowka()}px`,
        end: () => `+=${rozdzialy * dlugoscRozdzialu()}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        scrub: 0.3,
        invalidateOnRefresh: true,
      },
    });
    os.current = tl;

    works.forEach((_, i) => {
      const warstwy = el.querySelectorAll(`[data-krok="${i}"]`);
      const tytul = el.querySelector(`[data-tytul="${i}"]`);
      const wskaznik = el.querySelector(`[data-wskaznik="${i}"]`);

      /* Wejście rozdziału. Pierwszy jest widoczny od startu. */
      if (i > 0) {
        tl.to(warstwy, { opacity: 1, duration: PRZENIKANIE }, i);
        if (tytul) tl.to(tytul, { color: AKTYWNY, duration: PRZENIKANIE }, i);
        if (wskaznik) tl.to(wskaznik, { width: 40, duration: PRZENIKANIE }, i);
      }

      /* Wyjście. Ostatni zostaje do końca, bo po nim idzie przytrzymanie. */
      if (i < ostatni) {
        tl.to(warstwy, { opacity: 0, duration: PRZENIKANIE }, i + 1);
        if (tytul) tl.to(tytul, { color: NIEAKTYWNY, duration: PRZENIKANIE }, i + 1);
        if (wskaznik) tl.to(wskaznik, { width: 0, duration: PRZENIKANIE }, i + 1);
      }
    });

    /* Puste przytrzymanie: ostatnie zdjęcie dostaje własny rozdział, zanim
       sekcja się odepnie. */
    tl.to({}, { duration: 1 }, works.length);
  });

  /* Kliknięcie przesuwa stronę na środek rozdziału — oś czasu podąża za
     przewijaniem, więc nic nie walczy ze sobą. */
  const idzDo = (i: number) => {
    const st = os.current?.scrollTrigger;
    if (!st) return;
    const rozdzialy = works.length + 1;
    window.scrollTo({
      top: st.start + (st.end - st.start) * ((i + 0.5) / rozdzialy),
      behavior: "smooth",
    });
  };

  /* Bez ruchu: zwykła, przewijalna lista. Nic nie jest przypięte. */
  if (bezRuchu) {
    return (
      <section
        id="zakres"
        className="gut scroll-mt-20 py-[clamp(3.5rem,6.5vw,5.5rem)]"
      >
        <Glowka />
        <ol className="mt-8 flex flex-col gap-10">
          {works.map((w) => (
            <li key={w.no} className="spine pt-6">
              <div className="flex items-baseline gap-4">
                <span className="eyebrow shrink-0 tabular-nums text-yellow">
                  {w.no}
                </span>
                <h3 className="font-display text-[clamp(1.1rem,2.4vw,1.6rem)] font-extrabold tracking-[-0.035em] uppercase">
                  {w.title}
                </h3>
              </div>
              <p className="mt-2 text-sm text-grey">{w.note}</p>
              <div className="relative mt-4 aspect-[16/10] w-full overflow-hidden bg-graphite">
                <Image
                  src={w.photo.src}
                  alt={w.photo.alt}
                  fill
                  sizes="(min-width:1024px) 56vw, 100vw"
                  placeholder="blur"
                  blurDataURL={blurFor(w.photo.src)}
                  className="object-cover"
                />
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section
      id="zakres"
      ref={root}
      className="gut flex h-[calc(100svh-64px)] min-h-[560px] flex-col justify-center overflow-hidden bg-bone py-6 lg:h-[calc(100svh-68px)] lg:py-8"
    >
      <Glowka warstwowy />

      {/* Desktop: lista po lewej, kadr po prawej. */}
      <div className="mt-6 hidden min-h-0 flex-1 gap-x-10 lg:grid lg:grid-cols-12">
        <ol className="lg:col-span-5 lg:self-center">
          {works.map((w, i) => (
            <li key={w.no} className="spine">
              <button
                type="button"
                onClick={() => idzDo(i)}
                className="flex w-full items-baseline gap-5 py-[clamp(0.6rem,1.2vw,0.95rem)] text-left"
              >
                <span className="eyebrow w-7 shrink-0 tabular-nums text-grey">
                  {w.no}
                </span>
                <span
                  data-tytul={i}
                  style={{ color: i === 0 ? AKTYWNY : NIEAKTYWNY }}
                  className="font-display text-[clamp(1.05rem,2vw,1.6rem)] font-extrabold tracking-[-0.035em] uppercase"
                >
                  {w.title}
                </span>
                <span
                  data-wskaznik={i}
                  style={{ width: i === 0 ? 40 : 0 }}
                  className="ml-auto h-px shrink-0 self-center bg-yellow"
                />
              </button>
            </li>
          ))}
          <li className="spine" />
        </ol>

        <div className="flex min-h-0 flex-col lg:col-span-7">
          <Kadr className="min-h-0 flex-1" />
          <div className="relative mt-3 h-[3.25rem] shrink-0">
            {works.map((w, i) => (
              <div
                key={w.no}
                data-krok={i}
                style={{ opacity: i === 0 ? 1 : 0 }}
                className="absolute inset-0 flex flex-col gap-1"
              >
                <span className="font-display text-[1rem] font-extrabold tracking-[-0.02em] uppercase">
                  {w.title}
                </span>
                <span className="text-sm text-grey">{w.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Telefon: kadr, aktywna pozycja, opis, pasek postępu. */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col lg:hidden">
        <Kadr className="min-h-0 flex-1" />

        <div className="relative mt-4 h-[6.5rem] shrink-0">
          {works.map((w, i) => (
            <div
              key={w.no}
              data-krok={i}
              style={{ opacity: i === 0 ? 1 : 0 }}
              className="absolute inset-0"
            >
              <div className="flex items-baseline gap-3">
                <span className="eyebrow shrink-0 tabular-nums text-yellow">
                  {w.no}
                </span>
                <h3 className="font-display text-[clamp(1.15rem,5.5vw,1.6rem)] leading-[1.1] font-extrabold tracking-[-0.035em] uppercase">
                  {w.title}
                </h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-grey">{w.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 flex shrink-0 gap-1.5">
          {works.map((w, i) => (
            <button
              key={w.no}
              type="button"
              onClick={() => idzDo(i)}
              className="h-6 flex-1 pt-2.5"
            >
              <span className="sr-only">{w.title}</span>
              <span className="relative block h-[3px] w-full bg-graphite/15">
                <span
                  data-krok={i}
                  style={{ opacity: i === 0 ? 1 : 0 }}
                  className="absolute inset-0 bg-yellow"
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Glowka({ warstwowy = false }: { warstwowy?: boolean }) {
  return (
    <div className="shrink-0">
      <div className="h-px bg-[var(--rule)]" />
      <div className="flex items-baseline justify-between gap-6 pt-4">
        <p className="eyebrow text-grey">Zakres</p>
        <p className="eyebrow tabular-nums text-grey">
          {warstwowy ? (
            <span className="relative inline-block h-[1em] w-[2.2ch] align-baseline">
              {works.map((w, i) => (
                <span
                  key={w.no}
                  data-krok={i}
                  style={{ opacity: i === 0 ? 1 : 0 }}
                  className="absolute inset-0"
                >
                  {w.no}
                </span>
              ))}
            </span>
          ) : (
            works[0].no
          )}{" "}
          / {String(works.length).padStart(2, "0")}
        </p>
      </div>
      <h2 className="mt-3 text-[clamp(1.6rem,4.5vw,3.25rem)]">Co robimy.</h2>
    </div>
  );
}

/** Kadr. Wszystkie zdjęcia są w DOM i tylko się przenikają. */
function Kadr({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-full overflow-hidden bg-graphite ${className}`}>
      {works.map((w, i) => (
        <div
          key={w.no}
          data-krok={i}
          style={{ opacity: i === 0 ? 1 : 0 }}
          className="absolute inset-0"
        >
          <Image
            src={w.photo.src}
            alt={w.photo.alt}
            fill
            sizes="(min-width:1024px) 56vw, 100vw"
            placeholder="blur"
            blurDataURL={blurFor(w.photo.src)}
            /* Sekwencja i tak pokaże wszystkie kadry, a scrub nie może czekać
               na pobieranie. */
            loading="eager"
            priority={i === 0}
            className="object-cover"
          />
        </div>
      ))}

      <span className="pointer-events-none absolute bottom-0 left-0 z-10 block h-[2.2em] w-[2.6em] bg-yellow font-display text-[clamp(1.3rem,2.6vw,2rem)] leading-none font-extrabold tracking-[-0.05em] text-graphite tabular-nums">
        {works.map((w, i) => (
          <span
            key={w.no}
            data-krok={i}
            style={{ opacity: i === 0 ? 1 : 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {w.no}
          </span>
        ))}
      </span>
    </div>
  );
}
