"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, reducedMotion } from "@/lib/gsap";
import { projectTypes } from "@/lib/content";
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

type Stan = "form" | "sending" | "sent" | "not_configured" | "error";

/**
 * Formularz zapytania o wycenę. Żyje wewnątrz modala, więc nie ma tu żadnej
 * oprawy strony — tylko postęp, dwa kroki i ekran po wysyłce.
 */
export function WycenaForm({ realizacja }: { realizacja?: string }) {
  const [krok, setKrok] = useState<1 | 2>(1);
  const [dane, setDane] = useState<Dane>(PUSTE);
  const [stan, setStan] = useState<Stan>("form");
  const [bledy, setBledy] = useState<Record<string, string>>({});
  const startedAt = useRef(Date.now());
  const krokRef = useRef<HTMLDivElement>(null);
  const pierwszy = useRef(true);

  const ustaw = (patch: Partial<Dane>) => setDane((d) => ({ ...d, ...patch }));

  /* Krótkie przejście między krokami. Bez skoku układu. */
  useEffect(() => {
    if (pierwszy.current) {
      pierwszy.current = false;
      return;
    }
    const el = krokRef.current;
    if (!el || reducedMotion()) return;
    gsap.fromTo(
      el,
      { opacity: 0, x: krok === 2 ? 20 : -20 },
      { opacity: 1, x: 0, duration: 0.45, ease: "expo.out" },
    );
  }, [krok]);

  function dalej() {
    const b: Record<string, string> = {};
    if (!dane.typ) b.typ = "Wybierz rodzaj inwestycji.";
    if (dane.lokalizacja.trim().length < 2) b.lokalizacja = "Podaj miejscowość.";
    setBledy(b);
    if (Object.keys(b).length) return;
    setKrok(2);
    krokRef.current?.closest("[data-wy-scroll]")?.scrollTo({ top: 0 });
  }

  async function wyslij(e: React.FormEvent) {
    e.preventDefault();
    const b: Record<string, string> = {};
    if (dane.imie.trim().length < 2) b.imie = "Podaj imię.";
    if ((dane.telefon.match(/\d/g) ?? []).length < 9) {
      b.telefon = "Podaj numer telefonu (min. 9 cyfr).";
    }
    if (dane.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(dane.email)) {
      b.email = "Sprawdź adres e-mail.";
    }
    if (!dane.zgoda) b.zgoda = "Potrzebujemy tej zgody, żeby odpowiedzieć.";
    setBledy(b);
    if (Object.keys(b).length) return;

    setStan("sending");
    const fd = new FormData();
    fd.set("typ", projectTypes.find((t) => t.id === dane.typ)?.label ?? dane.typ);
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
      const data = await res.json().catch(() => ({}));
      if (res.ok) setStan("sent");
      else if (data?.code === "not_configured") setStan("not_configured");
      else setStan("error");
    } catch {
      setStan("error");
    }
  }

  if (stan === "sent") return <Dziekujemy />;

  return (
    <div>
      <Postep krok={krok} />

      {realizacja ? (
        <p className="mt-6 border-l-2 border-yellow bg-bone-2 px-4 py-3 text-sm">
          Pytasz o realizację: <strong>{realizacja}</strong>
        </p>
      ) : null}

      <div ref={krokRef} className="mt-8">
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
