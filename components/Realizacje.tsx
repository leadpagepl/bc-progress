"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap, useGsap } from "@/lib/gsap";
import { SectionHead } from "./Section";
import { Lightbox } from "./Lightbox";
import { projects, type Project } from "@/lib/content";
import { blurFor } from "@/lib/blur";

/**
 * Realizacje.
 *
 * Zwarta siatka kafli zamiast długiej kolumny dużych kadrów: pierwszy kafel
 * jest szeroki i otwiera układ, reszta wypełnia dwa rzędy. Szczeliny są
 * minimalne, żeby całość czytała się jak jedna plansza, a nie zbiór kart.
 */

/* Pierwszy kafel zajmuje dwie kolumny i w obu układach ma własne proporcje. */
const KAFLE = [
  { span: "col-span-2", ratio: "aspect-[16/10] lg:aspect-[8/3]", sizes: "(min-width:1024px) 50vw, 100vw" },
  { span: "", ratio: "aspect-[3/4] lg:aspect-[4/3]", sizes: "(min-width:1024px) 25vw, 50vw" },
  { span: "", ratio: "aspect-[3/4] lg:aspect-[4/3]", sizes: "(min-width:1024px) 25vw, 50vw" },
  { span: "", ratio: "aspect-[3/4] lg:aspect-[4/3]", sizes: "(min-width:1024px) 25vw, 50vw" },
  { span: "", ratio: "aspect-[3/4] lg:aspect-[4/3]", sizes: "(min-width:1024px) 25vw, 50vw" },
  { span: "", ratio: "aspect-[3/4] lg:aspect-[4/3]", sizes: "(min-width:1024px) 25vw, 50vw" },
  { span: "", ratio: "aspect-[3/4] lg:aspect-[4/3]", sizes: "(min-width:1024px) 25vw, 50vw" },
];

export function Realizacje() {
  const [open, setOpen] = useState<Project | null>(null);
  const root = useRef<HTMLElement>(null);

  useGsap(root, () => {
    gsap.fromTo(
      ".kafel",
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.05,
        ease: "expo.out",
        scrollTrigger: { trigger: ".siatka", start: "top 85%" },
      },
    );
  });

  return (
    <section
      id="realizacje"
      ref={root}
      className="gut scroll-mt-20 py-[clamp(3.5rem,6.5vw,5.5rem)]"
    >
      <SectionHead
        label="Realizacje"
        lines={["Zobacz nasze", "realizacje."]}
        lead={<>Wybór budów z naszej dokumentacji.</>}
      />

      <div className="siatka mt-[clamp(1.75rem,3.5vw,2.75rem)] grid grid-cols-2 gap-[3px] lg:grid-cols-4">
        {projects.map((p, i) => (
          <Kafel key={p.id} project={p} cfg={KAFLE[i]} onOpen={() => setOpen(p)} />
        ))}
      </div>

      <Lightbox project={open} onClose={() => setOpen(null)} />
    </section>
  );
}

function Kafel({
  project,
  cfg,
  onOpen,
}: {
  project: Project;
  cfg: (typeof KAFLE)[number];
  onOpen: () => void;
}) {
  const foto = project.photos[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`kafel anim-hide group relative block overflow-hidden bg-graphite text-left ${cfg.span} ${cfg.ratio}`}
    >
      <Image
        src={foto.src}
        alt={foto.alt}
        fill
        sizes={cfg.sizes}
        placeholder="blur"
        blurDataURL={blurFor(foto.src)}
        className="object-cover object-center brightness-[0.82] transition-[transform,filter] duration-[700ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.04] group-hover:brightness-100"
      />

      {/* Przyciemnienie tylko u dołu — tam, gdzie stoi tekst. */}
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(14,15,14,0.85)_0%,rgba(14,15,14,0.25)_45%,rgba(14,15,14,0)_75%)]"
      />

      {/* Strzałka siedzi w narożniku, żeby nigdy nie wchodziła w tytuł —
          przy dłuższych nazwach na wąskim kaflu kolidowała z tekstem. */}
      <span className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center bg-yellow transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100">
        <svg viewBox="0 0 24 12" fill="none" className="w-4 text-graphite" aria-hidden="true">
          <path d="M0 6h22M17 1l5 5-5 5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </span>

      <span className="absolute inset-x-0 bottom-0 block p-3 sm:p-4">
        <span className="eyebrow block text-yellow/90">{project.type}</span>
        <span className="mt-1.5 block hyphens-auto break-words font-display text-[clamp(0.875rem,1.5vw,1.25rem)] leading-[1.12] font-extrabold tracking-[-0.025em] text-bone uppercase">
          {project.short ?? project.title}
        </span>
      </span>
    </button>
  );
}
