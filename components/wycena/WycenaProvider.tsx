"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { WycenaModal } from "./WycenaModal";

type Kontekst = {
  /** Otwiera modal. Opcjonalnie przekazuje nazwę realizacji, której dotyczy pytanie. */
  otworz: (realizacja?: string) => void;
};

const Ctx = createContext<Kontekst | null>(null);

/**
 * Jedno źródło prawdy dla modala wyceny.
 *
 * Modal jest w drzewie dokładnie raz, a każde CTA na stronie tylko woła
 * `otworz()`. Dzięki temu nie ma kilku kopii formularza ani rozjechanych stanów.
 */
export function WycenaProvider({ children }: { children: React.ReactNode }) {
  const [otwarty, setOtwarty] = useState(false);
  const [realizacja, setRealizacja] = useState<string | undefined>(undefined);
  /* Element, który otworzył modal — po zamknięciu wraca do niego fokus. */
  const wyzwalacz = useRef<HTMLElement | null>(null);

  const otworz = useCallback((ref?: string) => {
    wyzwalacz.current = document.activeElement as HTMLElement | null;
    setRealizacja(ref);
    setOtwarty(true);
  }, []);

  const zamknij = useCallback(() => {
    setOtwarty(false);
    setRealizacja(undefined);
    /* Fokus wraca dopiero, gdy modal zniknie z drzewa. */
    requestAnimationFrame(() => wyzwalacz.current?.focus?.());
  }, []);

  return (
    <Ctx.Provider value={{ otworz }}>
      {children}
      <WycenaModal otwarty={otwarty} realizacja={realizacja} onClose={zamknij} />
    </Ctx.Provider>
  );
}

export function useWycena() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useWycena wymaga WycenaProvider w drzewie komponentów.");
  }
  return ctx;
}
