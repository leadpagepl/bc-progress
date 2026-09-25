"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { blurFor } from "@/lib/blur";
import { useWycena } from "@/components/wycena/WycenaProvider";
import type { Project } from "@/lib/content";

export function Lightbox({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const { otworz } = useWycena();
  const [i, setI] = useState(0);
  /* Które kadry są już wczytane i który z nich faktycznie pokazujemy. */
  const [wczytane, setWczytane] = useState<Record<number, boolean>>({});
  const [ostatnieGotowe, setOstatnieGotowe] = useState(0);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setI(0);
    setWczytane({});
    setOstatnieGotowe(0);
  }, [project]);

  /* Dopóki wybrany kadr się nie wczytał, na ekranie zostaje ostatni gotowy. */
  useEffect(() => {
    if (wczytane[i]) setOstatnieGotowe(i);
  }, [i, wczytane]);

  const go = useCallback(
    (d: number) => {
      if (!project) return;
      setI((v) => (v + d + project.photos.length) % project.photos.length);
    },
    [project],
  );

  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [project, go, onClose]);

  /* Przesunięcie palcem w poziomie przełącza zdjęcie. Nie wołamy
     preventDefault, więc pionowe gesty zachowują się normalnie. */
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? 1 : -1);
    }
  };

  if (!project) return null;
  const photo = project.photos[i];
  const widoczne = wczytane[i] ? i : ostatnieGotowe;

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col bg-ink"
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        tabIndex={-1}
        className="gut flex items-start justify-between gap-6 py-6 outline-none"
      >
        <div>
          <p className="eyebrow text-yellow">{project.type}</p>
          <p className="mt-2 font-display text-2xl font-extrabold tracking-[-0.03em] text-bone uppercase">
            {project.title}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {/* Pytanie o podobną realizację przenosi jej nazwę do formularza. */}
          <button
            type="button"
            /* Najpierw zamykamy podgląd, potem otwieramy modal — dwie blokady
               przewijania nie nakładają się wtedy na siebie. */
            onClick={() => {
              const tytul = project.title;
              onClose();
              otworz(tytul);
            }}
            className="hidden items-center gap-3 bg-yellow px-5 py-3.5 text-[11px] font-bold tracking-[0.14em] text-graphite uppercase transition-transform duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 sm:inline-flex"
          >
            Zapytaj o podobną realizację
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center border border-bone/25 text-bone transition-colors hover:border-bone hover:bg-bone hover:text-graphite"
          >
            <span className="sr-only">Zamknij</span>
            <svg viewBox="0 0 16 16" className="w-4" aria-hidden="true">
              <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="gut relative min-h-0 flex-1 pb-4"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Każdy kadr ma rozmyty podgląd, więc od pierwszej klatki widać
            treść, a nie czarne tło kontenera. Pełne zdjęcie przejmuje ekran
            dopiero, gdy się wczyta — do tego czasu zostaje poprzednie.
            Sąsiednie kadry dostają `priority`, żeby „dalej" było natychmiast. */}
        <div className="relative h-full w-full">
          {project.photos.map((p, k) => {
            const dystans = Math.min(
              Math.abs(k - i),
              project.photos.length - Math.abs(k - i),
            );
            return (
              <Image
                key={p.src}
                src={p.src}
                alt={k === widoczne ? p.alt : ""}
                fill
                sizes="100vw"
                quality={82}
                priority={dystans <= 1}
                placeholder="blur"
                blurDataURL={blurFor(p.src)}
                aria-hidden={k !== widoczne}
                onLoad={() => setWczytane((w) => (w[k] ? w : { ...w, [k]: true }))}
                className="object-contain transition-opacity duration-200 ease-linear"
                style={{ opacity: k === widoczne ? 1 : 0 }}
              />
            );
          })}
        </div>
      </div>

      <div className="gut spine-dark flex items-center justify-between py-5">
        <p className="hidden max-w-[46ch] text-sm text-bone/60 sm:block">{photo.alt}</p>
        {/* Na telefonie to samo CTA, ale w stopce, gdzie jest na nie miejsce. */}
        <button
          type="button"
          onClick={() => {
            const tytul = project.title;
            onClose();
            otworz(tytul);
          }}
          className="bg-yellow px-4 py-3 text-[11px] font-bold tracking-[0.12em] text-graphite uppercase sm:hidden"
        >
          Zapytaj o wycenę
        </button>
        <div className="flex shrink-0 items-center gap-5">
          <span className="eyebrow tabular-nums text-bone/60">
            {String(i + 1).padStart(2, "0")} / {String(project.photos.length).padStart(2, "0")}
          </span>
          <div className="flex gap-2">
            <NavBtn onClick={() => go(-1)} label="Poprzednie zdjęcie" flip />
            <NavBtn onClick={() => go(1)} label="Następne zdjęcie" />
          </div>
        </div>
      </div>
    </div>
  );
}

function NavBtn({
  onClick,
  label,
  flip = false,
}: {
  onClick: () => void;
  label: string;
  flip?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-14 items-center justify-center border border-bone/25 text-bone transition-colors hover:border-yellow hover:bg-yellow hover:text-graphite"
    >
      <span className="sr-only">{label}</span>
      <svg
        viewBox="0 0 24 12"
        fill="none"
        className={`w-5 ${flip ? "rotate-180" : ""}`}
        aria-hidden="true"
      >
        <path d="M0 6h22M17 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    </button>
  );
}
