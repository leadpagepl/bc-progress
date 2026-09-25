"use client";

import { useLayoutEffect, useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  gsap.defaults({ ease: "power3.out", duration: 0.9 });

  /* ScrollTrigger mierzy stronę raz. Kiedy dojadą fonty albo zdjęcia, albo
     telefon zmieni orientację, wysokości się przesuwają — bez odświeżenia
     wyzwalacze odpalałyby w złych miejscach. */
  const refresh = () => ScrollTrigger.refresh();

  window.addEventListener("load", refresh);
  window.addEventListener("orientationchange", () => setTimeout(refresh, 250));
  document.fonts?.ready.then(refresh).catch(() => {});
}

export const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function reducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Jeden kontekst GSAP na komponent. Kontekst jest sprzątany przy odmontowaniu,
 * więc każda animowana właściwość ma dokładnie jednego właściciela.
 *
 * Gdy użytkownik prosi o ograniczenie ruchu, elementy są po prostu pokazywane.
 */
export function useGsap(
  scope: RefObject<HTMLElement | null>,
  setup: (ctx: { self: HTMLElement }) => void,
) {
  useIsoLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;

    if (reducedMotion()) {
      const hidden = [el, ...el.querySelectorAll(".anim-hide")];
      hidden.forEach((n) => (n as HTMLElement).classList.add("is-shown"));
      return;
    }

    const ctx = gsap.context(() => setup({ self: el }), el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Stan startowy i docelowy maskowanego wiersza.
 *
 * `y: 0` jest tu konieczne: GSAP zwija istniejącą właściwość `translate`
 * (stan startowy z CSS) do swojego `y`, więc bez wyzerowania przesunięcie
 * sumowałoby się z `yPercent` i wiersz zostawałby pod maską.
 */
export const LINE_FROM = () => ({ yPercent: 105, y: 0 });
export const LINE_TO = () => ({ yPercent: 0, y: 0 });

export { gsap, ScrollTrigger };
