"use client";

import { useRef, useState } from "react";
import { projectTypes, uploadLimits } from "@/lib/content";
import type { Dane } from "./WycenaForm";
import { Naglowek, Pole, Przycisk, Strzalka } from "./Pola";

const MB = (b: number) => `${(b / (1024 * 1024)).toFixed(1)} MB`;

export function KrokInwestycja({
  dane,
  bledy,
  ustaw,
  onDalej,
}: {
  dane: Dane;
  bledy: Record<string, string>;
  ustaw: (p: Partial<Dane>) => void;
  onDalej: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [nadPolem, setNadPolem] = useState(false);
  const [blodPliku, setBlodPliku] = useState("");

  /** Ta sama kontrola co na serwerze: liczba, rozmiar, typ. */
  function dodaj(nowe: FileList | null) {
    if (!nowe?.length) return;
    setBlodPliku("");
    const lista = [...dane.pliki];

    for (const f of Array.from(nowe)) {
      if (lista.length >= uploadLimits.maxFiles) {
        setBlodPliku(`Maksymalnie ${uploadLimits.maxFiles} pliki.`);
        break;
      }
      if (!(uploadLimits.accept as readonly string[]).includes(f.type)) {
        setBlodPliku("Przyjmujemy pliki JPG, PNG, WebP i PDF.");
        continue;
      }
      if (f.size > uploadLimits.maxFileBytes) {
        setBlodPliku(`Jeden plik może mieć najwyżej ${MB(uploadLimits.maxFileBytes)}.`);
        continue;
      }
      const suma = lista.reduce((s, x) => s + x.size, 0) + f.size;
      if (suma > uploadLimits.maxTotalBytes) {
        setBlodPliku(`Razem pliki mogą mieć najwyżej ${MB(uploadLimits.maxTotalBytes)}.`);
        break;
      }
      if (lista.some((x) => x.name === f.name && x.size === f.size)) continue;
      lista.push(f);
    }

    ustaw({ pliki: lista });
    if (input.current) input.current.value = "";
  }

  return (
    <div className="flex flex-col gap-10">
      <Naglowek
        tytul="Co chcesz zbudować?"
        opis="Opowiedz nam krótko o swojej inwestycji."
      />

      {/* Rodzaj inwestycji */}
      <fieldset>
        <legend className="eyebrow text-grey">
          Rodzaj inwestycji<span className="ml-1 text-yellow">*</span>
        </legend>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {projectTypes.map((t) => {
            const wybrany = dane.typ === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => ustaw({ typ: t.id })}
                aria-pressed={wybrany}
                className={[
                  "group relative flex min-h-[5.5rem] flex-col justify-center border px-5 py-4 text-left transition-all duration-300 ease-[var(--ease-out-quint)]",
                  wybrany
                    ? "border-yellow bg-yellow/10"
                    : "border-[var(--rule)] bg-white hover:border-graphite/40",
                ].join(" ")}
              >
                <span className="font-display text-[1.0625rem] font-extrabold tracking-[-0.02em] uppercase">
                  {t.label}
                </span>
                <span className="mt-1.5 text-sm text-grey">{t.note}</span>

                <span
                  aria-hidden="true"
                  className={[
                    "absolute top-3 right-3 flex h-6 w-6 items-center justify-center bg-yellow transition-all duration-300",
                    wybrany ? "scale-100 opacity-100" : "scale-75 opacity-0",
                  ].join(" ")}
                >
                  <svg viewBox="0 0 16 16" className="w-3.5" aria-hidden="true">
                    <path
                      d="M3.5 8.4l3 3 6-6.4"
                      stroke="#191A19"
                      strokeWidth="2.2"
                      fill="none"
                    />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>
        {bledy.typ ? (
          <p className="mt-3 text-sm text-graphite">
            <span className="mr-2 inline-block h-2 w-2 bg-yellow align-middle" />
            {bledy.typ}
          </p>
        ) : null}
      </fieldset>

      <Pole
        name="lokalizacja"
        label="Gdzie planujesz budowę?"
        placeholder="Miejscowość"
        required
        autoComplete="address-level2"
        enterKeyHint="next"
        value={dane.lokalizacja}
        onChange={(v) => ustaw({ lokalizacja: v })}
        error={bledy.lokalizacja}
      />

      <Pole
        name="opis"
        label="Opisz swoją inwestycję"
        placeholder="Napisz krótko, co chcesz zrobić."
        textarea
        value={dane.opis}
        onChange={(v) => ustaw({ opis: v })}
      />

      {/* Załączniki */}
      <div>
        <p className="eyebrow text-grey">Dodaj zdjęcia lub projekt</p>
        <p className="mt-3 text-sm text-grey">
          Jeśli masz zdjęcia albo projekt, możesz je dołączyć.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setNadPolem(true);
          }}
          onDragLeave={() => setNadPolem(false)}
          onDrop={(e) => {
            e.preventDefault();
            setNadPolem(false);
            dodaj(e.dataTransfer.files);
          }}
          className={[
            "mt-4 border border-dashed px-5 py-7 text-center transition-colors duration-300",
            nadPolem ? "border-yellow bg-yellow/10" : "border-graphite/25 bg-white",
          ].join(" ")}
        >
          <input
            ref={input}
            id="pliki"
            type="file"
            multiple
            accept={uploadLimits.acceptAttr}
            className="sr-only"
            onChange={(e) => dodaj(e.target.files)}
          />
          <label
            htmlFor="pliki"
            className="inline-flex cursor-pointer items-center gap-3 border border-graphite/25 bg-bone px-5 py-3.5 text-[12px] font-bold tracking-[0.16em] uppercase transition-colors hover:border-graphite focus-within:border-graphite"
          >
            Wybierz pliki
          </label>
          <p className="mt-4 text-sm text-grey">
            {/* Na desktopie działa też przeciągnięcie. */}
            <span className="hidden sm:inline">Możesz też przeciągnąć je tutaj. </span>
            JPG, PNG, WebP lub PDF. Do {uploadLimits.maxFiles} plików,{" "}
            {MB(uploadLimits.maxFileBytes)} każdy.
          </p>
        </div>

        {blodPliku ? (
          <p className="mt-3 text-sm text-graphite">
            <span className="mr-2 inline-block h-2 w-2 bg-yellow align-middle" />
            {blodPliku}
          </p>
        ) : null}

        {dane.pliki.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2">
            {dane.pliki.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center justify-between gap-4 border border-[var(--rule)] bg-white px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{f.name}</span>
                  <span className="block text-xs text-grey">{MB(f.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    ustaw({ pliki: dane.pliki.filter((_, k) => k !== i) })
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center border border-graphite/20 transition-colors hover:border-graphite hover:bg-graphite hover:text-bone"
                >
                  <span className="sr-only">Usuń plik {f.name}</span>
                  <svg viewBox="0 0 16 16" className="w-3.5" aria-hidden="true">
                    <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.6" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div>
        <Przycisk onClick={onDalej}>
          Dalej
          <Strzalka />
        </Przycisk>
      </div>
    </div>
  );
}
