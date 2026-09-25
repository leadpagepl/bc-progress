"use client";

/** Wspólne elementy obu kroków: nagłówek, pole tekstowe, przycisk. */

export function Naglowek({ tytul, opis }: { tytul: string; opis?: string }) {
  return (
    <div>
      <h2 className="text-[clamp(1.6rem,4.5vw,2.4rem)]">{tytul}</h2>
      {opis ? <p className="mt-3 text-[1rem] text-grey">{opis}</p> : null}
    </div>
  );
}

export function Pole({
  name,
  label,
  value,
  onChange,
  error,
  textarea = false,
  ...rest
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  textarea?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  /* 17px to minimum, przy którym iOS nie przybliża widoku po wejściu w pole. */
  const cls = [
    "w-full border bg-white px-4 py-4 text-[1.0625rem] text-graphite",
    "placeholder:text-grey/70 transition-colors outline-none",
    error
      ? "border-yellow"
      : "border-[var(--rule)] focus:border-graphite",
  ].join(" ");

  return (
    <div>
      <label htmlFor={name} className="eyebrow block text-grey">
        {label}
        {rest.required ? <span className="ml-1 text-yellow">*</span> : null}
      </label>
      <div className="mt-3">
        {textarea ? (
          <textarea
            id={name}
            name={name}
            rows={4}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={rest.placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${name}-error` : undefined}
            className={`${cls} resize-none`}
          />
        ) : (
          <input
            id={name}
            name={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${name}-error` : undefined}
            className={cls}
            {...rest}
          />
        )}
      </div>
      {error ? (
        <p id={`${name}-error`} className="mt-2 text-sm text-graphite">
          <span className="mr-2 inline-block h-2 w-2 bg-yellow align-middle" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Przycisk({
  children,
  wariant = "glowny",
  ...rest
}: {
  children: React.ReactNode;
  wariant?: "glowny" | "poboczny";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "group inline-flex w-full items-center justify-between gap-6 px-7 py-5 text-[12px] font-bold tracking-[0.16em] uppercase transition-colors duration-300 disabled:opacity-60 sm:w-auto";
  const styl =
    wariant === "glowny"
      ? "bg-graphite text-bone hover:bg-yellow hover:text-graphite"
      : "border border-graphite/25 text-graphite hover:border-graphite";

  return (
    <button type="button" className={`${base} ${styl}`} {...rest}>
      {children}
    </button>
  );
}

export function Strzalka({ wstecz = false }: { wstecz?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 12"
      fill="none"
      className={[
        "w-5 transition-transform duration-400 ease-[var(--ease-out-quint)]",
        wstecz
          ? "rotate-180 group-hover:-translate-x-1.5"
          : "group-hover:translate-x-1.5",
      ].join(" ")}
      aria-hidden="true"
    >
      <path d="M0 6h22M17 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
