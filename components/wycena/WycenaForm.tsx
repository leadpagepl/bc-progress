"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, reducedMotion } from "@/lib/gsap";
import {
  isValidDescription,
  isValidEmail,
  isValidLocation,
  isValidName,
  isValidPhone,
  leadLimits,
  normalizeText,
  projectTypeLabel,
} from "@/lib/lead";
import { KrokInwestycja } from "./KrokInwestycja";
import { KrokKontakt } from "./KrokKontakt";
import { Postep } from "./Postep";
import { Dziekujemy } from "./Dziekujemy";

export type Dane = {
  typ: string;
  lokalizacja: string;
  opis: string;
  pliki: File[];
  imie: string;
  telefon: string;
  email: string;
  zgoda: boolean;
};

const PUSTE: Dane = {
  typ: "",
  lokalizacja: "",
  opis: "",
  pliki: [],
  imie: "",
  telefon: "",
  email: "",
  zgoda: false,
};

/** `invalid` i `unavailable` to odmiany błędu z własnym komunikatem. */
export type Stan = "idle" | "submitting" | "success" | "error" | "invalid" | "unavailable";

/**
 * Formularz zapytania o wycenę. Żyje wewnątrz modala, więc nie ma tu żadnej
 * oprawy strony — tylko postęp, dwa kroki i ekran po wysyłce.
 */
export function WycenaForm({ realizacja }: { realizacja?: string }) {
  const [krok, setKrok] = useState<1 | 2>(1);
  const [dane, setDane] = useState<Dane>(PUSTE);
  const [stan, setStan] = useState<Stan>("idle");
  const [bledy, setBledy] = useState<Record<string, string>>({});
  const startedAt = useRef(Date.now());
  const krokRef = useRef<HTMLDivElement>(null);
  const pierwszy = useRef(true);
  /* Blokada niezależna od renderu: drugi klik albo Enter w trakcie wysyłki
     nie tworzy drugiego żądania, zanim przycisk zdąży się wyłączyć. */
  const wysylka = useRef(false);

  const ustaw = (patch: Partial<Dane>) => setDane((d) => ({ ...d, ...patch }));

  /* Krótkie przejście między krokami. Bez skoku układu. */
  useEffect(() => {
    if (pierwszy.current) {
      pierwszy.current = false;
      return;
    }
    const el = krokRef.current;
    if (!el) return;
    /* Przycisk Dalej / Wstecz zniknął z drzewa — fokus zostaje w modalu. */
    el.focus({ preventScroll: true });
    if (reducedMotion()) return;
    gsap.fromTo(
      el,
      { opacity: 0, x: krok === 2 ? 20 : -20 },
      { opacity: 1, x: 0, duration: 0.45, ease: "expo.out" },
    );
  }, [krok]);

  /** Fokus na pierwszym polu z błędem, w kolejności wyświetlania. */
  function fokusNaBlad(b: Record<string, string>, kolejnosc: string[]) {
    const klucz = kolejnosc.find((k) => b[k]);
    if (!klucz) return;
    krokRef.current
      ?.querySelector<HTMLElement>(klucz === "typ" ? "fieldset button" : `[name="${klucz}"]`)
      ?.focus();
  }

  function dalej() {
    const b: Record<string, string> = {};
    if (!projectTypeLabel(dane.typ)) b.typ = "Wybierz rodzaj inwestycji.";
    if (!isValidLocation(normalizeText(dane.lokalizacja))) b.lokalizacja = "Podaj miejscowość.";
    if (!isValidDescription(normalizeText(dane.opis, { multiline: true }))) {
      b.opis = `Opis może mieć najwyżej ${leadLimits.description.max} znaków.`;
    }
    setBledy(b);
    if (Object.keys(b).length) {
      fokusNaBlad(b, ["typ", "lokalizacja", "opis"]);
      return;
    }
    setKrok(2);
    krokRef.current?.closest("[data-wy-scroll]")?.scrollTo({ top: 0 });
  }

  async function wyslij(e: React.FormEvent) {
    e.preventDefault();
    if (wysylka.current) return;

    const b: Record<string, string> = {};
    if (!isValidName(normalizeText(dane.imie))) b.imie = "Podaj imię.";
    if (!isValidPhone(normalizeText(dane.telefon))) {
      b.telefon = "Podaj numer telefonu (min. 9 cyfr).";
    }
    const email = normalizeText(dane.email);
    if (email && !isValidEmail(email)) b.email = "Sprawdź adres e-mail.";
    if (!dane.zgoda) b.zgoda = "Potrzebujemy tej zgody, żeby odpowiedzieć.";
    setBledy(b);
    if (Object.keys(b).length) {
      fokusNaBlad(b, ["imie", "telefon", "email", "zgoda"]);
      return;
    }

    wysylka.current = true;
    setStan("submitting");
    const fd = new FormData();
    fd.set("typ", dane.typ);
    fd.set("lokalizacja", dane.lokalizacja);
    fd.set("opis", dane.opis);
    fd.set("imie", dane.imie);
    fd.set("telefon", dane.telefon);
    fd.set("email", dane.email);
    fd.set("zgoda", dane.zgoda ? "on" : "");
    fd.set("ts", String(startedAt.current));
    fd.set("firma", "");
    if (realizacja) fd.set("realizacja", realizacja);
    dane.pliki.forEach((f) => fd.append("pliki", f));

    try {
      const res = await fetch("/api/wycena", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) setStan("success");
      else if (data?.code === "SERVICE_UNAVAILABLE") setStan("unavailable");
      else if (data?.code === "VALIDATION_ERROR") setStan("invalid");
      else setStan("error");
    } catch {
      setStan("error");
    } finally {
      wysylka.current = false;
    }
  }

  if (stan === "success") return <Dziekujemy />;

  return (
    <div>
      <Postep krok={krok} />

      {realizacja ? (
        <p className="mt-6 border-l-2 border-yellow bg-bone-2 px-4 py-3 text-sm">
          Pytasz o realizację: <strong>{realizacja}</strong>
        </p>
      ) : null}

      <div ref={krokRef} tabIndex={-1} className="mt-8 outline-none">
        {krok === 1 ? (
          <KrokInwestycja dane={dane} bledy={bledy} ustaw={ustaw} onDalej={dalej} />
        ) : (
          <KrokKontakt
            dane={dane}
            bledy={bledy}
            stan={stan}
            ustaw={ustaw}
            onWstecz={() => setKrok(1)}
            onSubmit={wyslij}
          />
        )}
      </div>

      <p className="mt-8 text-sm text-grey">
        Wycenę przygotowujemy po rozmowie. Formularz sam jej nie wylicza.
      </p>
    </div>
  );
}
