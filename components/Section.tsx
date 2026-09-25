"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGsap, LINE_FROM, LINE_TO } from "@/lib/gsap";

/**
 * Wspólna głowa sekcji: cienka linia, etykieta, nagłówek spod maski.
 * Nagłówek dzielimy na linie ręcznie (tablica), żeby maska była przewidywalna.
 */
export function SectionHead({
  label,
  lines,
  lead,
  tone = "dark",
  className = "",
}: {
  label: string;
  lines: string[];
  lead?: ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGsap(root, () => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: root.current, start: "top 78%" },
    });
    tl.to(".sec-rule", { scaleX: 1, duration: 1.1, ease: "expo.out" })
      .to(".sec-label", { opacity: 1, x: 0, duration: 0.7 }, 0.1)
      .fromTo(
        ".sec-line",
        LINE_FROM(),
        { ...LINE_TO(), duration: 1.15, stagger: 0.08, ease: "expo.out" },
        0.15,
      )
      .to(".sec-lead", { opacity: 1, y: 0, duration: 0.8 }, 0.45);
  });

  const light = tone === "light";

  return (
    <div ref={root} className={className}>
      <div
        className={[
          "sec-rule h-px origin-left scale-x-0",
          light ? "bg-[var(--rule-dark)]" : "bg-[var(--rule)]",
        ].join(" ")}
      />
      <div className="grid gap-x-8 gap-y-7 pt-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p
            className={[
              "sec-label anim-hide eyebrow -translate-x-2",
              light ? "text-yellow" : "text-grey",
            ].join(" ")}
          >
            {label}
          </p>
          <h2
            className={[
              "mt-5 text-[clamp(2.15rem,6vw,5rem)]",
              light ? "text-bone" : "text-graphite",
            ].join(" ")}
          >
            {lines.map((l) => (
              <span className="line-mask" key={l}>
                <span className="line-inner sec-line">{l}</span>
              </span>
            ))}
          </h2>
        </div>
        {lead && (
          <div className="sec-lead anim-hide translate-y-4 lg:col-span-3 lg:col-start-10 lg:self-end">
            <div
              className={[
                "max-w-[42ch] text-[clamp(0.95rem,1.4vw,1.0625rem)] leading-relaxed",
                light ? "text-bone/70" : "text-graphite/70",
              ].join(" ")}
            >
              {lead}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Pojedynczy element odsłaniany przy scrollu. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGsap(root, () => {
    gsap.fromTo(
      root.current,
      { opacity: 0, y },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        delay,
        ease: "expo.out",
        scrollTrigger: { trigger: root.current, start: "top 88%" },
      },
    );
  });

  return (
    <div ref={root} className={`anim-hide ${className}`}>
      {children}
    </div>
  );
}
