"use client";

/**
 * Wskaźnik postępu. Żółta linia rośnie przy przejściu do drugiego kroku.
 * To czysty CSS na szerokości — nie rusza układu i nie wymaga GSAP-a.
 */
const KROKI = [
  { nr: "01", label: "Inwestycja" },
  { nr: "02", label: "Kontakt" },
];

export function Postep({ krok }: { krok: 1 | 2 }) {
  return (
    <div>
      <ol className="flex items-baseline gap-8">
        {KROKI.map((k, i) => {
          const aktywny = i + 1 === krok;
          const zrobiony = i + 1 < krok;
          return (
            <li key={k.nr} className="flex items-baseline gap-2.5">
              <span
                className={[
                  "eyebrow tabular-nums transition-colors duration-400",
                  aktywny || zrobiony ? "text-yellow" : "text-grey",
                ].join(" ")}
              >
                {k.nr}
              </span>
              <span
                className={[
                  "eyebrow transition-colors duration-400",
                  aktywny ? "text-graphite" : "text-grey",
                ].join(" ")}
              >
                {k.label}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 h-[2px] w-full bg-[var(--rule)]">
        <div
          className="h-full bg-yellow transition-[width] duration-700 ease-[var(--ease-out-quint)]"
          style={{ width: krok === 1 ? "50%" : "100%" }}
          role="progressbar"
          aria-valuenow={krok}
          aria-valuemin={1}
          aria-valuemax={2}
          aria-label={`Krok ${krok} z 2`}
        />
      </div>
    </div>
  );
}
