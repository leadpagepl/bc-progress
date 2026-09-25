/**
 * Logo BC PROGRES — wektorowa reprodukcja znaku dostarczonego przez klienta
 * (media-source/ikona.jpg, ikona2.jpg): żółty kwadrat z rosnącym wykresem,
 * sygnatura BC·PROGRES (P w kolorze marki) oraz linia i podpis „spółka z o.o.".
 */
export function Logo({
  className = "",
  tone = "dark",
  withTagline = true,
}: {
  className?: string;
  tone?: "dark" | "light";
  withTagline?: boolean;
}) {
  const word = tone === "dark" ? "#191A19" : "#F5F3EC";
  const y = "#FFD21C";

  return (
    <svg
      viewBox="0 0 300 62"
      className={className}
      role="img"
      aria-label="BC PROGRES spółka z o.o."
      fill="none"
    >
      {/* znak: kwadrat + rosnący wykres */}
      <rect x="0" y="2" width="36" height="36" fill={y} />
      <path
        d="M7.5 29.5 L15 21.5 L20.5 26 L28.5 16"
        stroke="#191A19"
        strokeWidth="2.6"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path d="M23.5 13.5 H30.5 V20.5 Z" fill="#191A19" />

      {/* sygnatura */}
      <text
        x="46"
        y="32"
        fill={word}
        fontFamily="var(--font-display), Arial Black, sans-serif"
        fontSize="30"
        fontWeight="800"
        letterSpacing="1.6"
        dominantBaseline="middle"
      >
        BC
        <tspan fill={y}>·P</tspan>
        ROGRES
      </text>

      {withTagline && (
        <>
          <line x1="46" y1="52" x2="128" y2="52" stroke={y} strokeWidth="1.4" />
          <text
            x="136"
            y="53"
            fill={y}
            fontFamily="var(--font-sans), sans-serif"
            fontSize="14.5"
            fontWeight="500"
            letterSpacing="1.1"
            dominantBaseline="middle"
          >
            spółka z o.o.
          </text>
        </>
      )}
    </svg>
  );
}

/** Sam znak — do favikony i stopki. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true" fill="none">
      <rect width="36" height="36" fill="#FFD21C" />
      <path
        d="M7.5 27.5 L15 19.5 L20.5 24 L28.5 14"
        stroke="#191A19"
        strokeWidth="2.6"
        strokeLinecap="square"
      />
      <path d="M23.5 11.5 H30.5 V18.5 Z" fill="#191A19" />
    </svg>
  );
}
