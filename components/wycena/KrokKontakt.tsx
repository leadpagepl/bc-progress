"use client";

import Link from "next/link";
import { company } from "@/lib/content";
import type { Dane } from "./WycenaForm";
import { Naglowek, Pole, Przycisk, Strzalka } from "./Pola";

export function KrokKontakt({
  dane,
  bledy,
  stan,
  ustaw,
  onWstecz,
  onSubmit,
}: {
  dane: Dane;
  bledy: Record<string, string>;
  stan: "form" | "sending" | "sent" | "not_configured" | "error";
  ustaw: (p: Partial<Dane>) => void;
  onWstecz: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-10">
      <Naglowek tytul="Jak możemy się z Tobą skontaktować?" />

      <div className="flex flex-col gap-7">
        <Pole
          name="imie"
          label="Imię"
          required
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="next"
          value={dane.imie}
          onChange={(v) => ustaw({ imie: v })}
          error={bledy.imie}
        />
        <Pole
          name="telefon"
          label="Telefon"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          enterKeyHint="next"
          value={dane.telefon}
          onChange={(v) => ustaw({ telefon: v })}
          error={bledy.telefon}
        />
        <Pole
          name="email"
          label="E-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          enterKeyHint="done"
          value={dane.email}
          onChange={(v) => ustaw({ email: v })}
          error={bledy.email}
        />
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-4 text-sm leading-relaxed text-graphite">
          <span className="relative mt-0.5 block h-6 w-6 shrink-0">
            <input
              type="checkbox"
              name="zgoda"
              checked={dane.zgoda}
              onChange={(e) => ustaw({ zgoda: e.target.checked })}
              className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none border border-graphite/35 bg-white transition-colors checked:border-yellow checked:bg-yellow"
            />
            <svg
              viewBox="0 0 16 16"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full opacity-0 peer-checked:opacity-100"
            >
              <path d="M3.5 8.4l3 3 6-6.4" stroke="#191A19" strokeWidth="2" fill="none" />
            </svg>
          </span>
          <span>
            Zgadzam się na kontakt w sprawie tego zapytania i znam{" "}
            <Link
              href="/polityka-prywatnosci"
              className="border-b border-graphite/35 pb-0.5 transition-colors hover:border-yellow hover:text-graphite"
            >
              politykę prywatności
            </Link>
            .
          </span>
        </label>
        {bledy.zgoda ? (
          <p className="mt-3 pl-10 text-sm text-graphite">
            <span className="mr-2 inline-block h-2 w-2 bg-yellow align-middle" />
            {bledy.zgoda}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:justify-end">
        <button
          type="submit"
          disabled={stan === "sending"}
          className="group inline-flex w-full items-center justify-between gap-6 bg-graphite px-7 py-5 text-[12px] font-bold tracking-[0.16em] text-bone uppercase transition-colors duration-300 hover:bg-yellow hover:text-graphite disabled:opacity-60 sm:w-auto"
        >
          {stan === "sending" ? "Wysyłanie…" : "Wyślij zapytanie"}
          <Strzalka />
        </button>

        <Przycisk wariant="poboczny" onClick={onWstecz} disabled={stan === "sending"}>
          <Strzalka wstecz />
          Wstecz
        </Przycisk>
      </div>

      {/* Komunikaty mówią prawdę o tym, co się wydarzyło. */}
      <p aria-live="polite" className="max-w-[52ch] text-sm leading-relaxed">
        {stan === "not_configured" && (
          <span className="text-graphite">
            <strong>Zapytanie nie zostało wysłane.</strong> Skrzynka firmy nie
            jest jeszcze podłączona do formularza. Twoje dane zostały w
            formularzu — napisz do nas na{" "}
            <a
              className="underline"
              href={company.instagram}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagramie
            </a>{" "}
            lub{" "}
            <a
              className="underline"
              href={company.facebook}
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebooku
            </a>
            , albo spróbuj ponownie później.
          </span>
        )}
        {stan === "error" && (
          <span className="text-graphite">
            <strong>Nie udało się wysłać zapytania.</strong> Dane zostały w
            formularzu, możesz spróbować jeszcze raz.
          </span>
        )}
      </p>
    </form>
  );
}
