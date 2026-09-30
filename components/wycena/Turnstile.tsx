"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";

/**
 * Cloudflare Turnstile bez dodatkowej biblioteki: skrypt ładowany dopiero
 * w kroku kontaktowym, widget renderowany jawnie.
 *
 * `interaction-only` — widget jest niewidoczny, dopóki Cloudflare nie
 * poprosi o kliknięcie; dopiero wtedy pojawia się pod zgodą.
 */

type TurnstileApi = {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SRC;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile"));
    script.onerror = () => {
      /* Kolejna próba (np. po powrocie do kroku) wczyta skrypt od nowa. */
      loading = null;
      script.remove();
      reject(new Error("turnstile"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export type TurnstileHandle = {
  /** Aktualny token albo null, jeśli nie pojawi się w `timeoutMs`. */
  token(timeoutMs?: number): Promise<string | null>;
  /** Nowy token po nieudanej wysyłce — poprzedni jest już zużyty. */
  reset(): void;
};

export function Turnstile({ ref }: { ref: Ref<TurnstileHandle> }) {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiting = useRef<((t: string) => void)[]>([]);
  const [interactive, setInteractive] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    loadTurnstile()
      .then((ts) => {
        if (cancelled || !box.current) return;
        widgetId.current = ts.render(box.current, {
          sitekey: siteKey,
          action: "wycena",
          theme: "light",
          size: "flexible",
          appearance: "interaction-only",
          callback: (t: string) => {
            token.current = t;
            waiting.current.splice(0).forEach((resolve) => resolve(t));
          },
          "expired-callback": () => {
            token.current = null;
          },
          "error-callback": () => {
            /* Turnstile sam ponawia próbę; wysyłka bez tokenu kończy się
               czytelnym komunikatem, a nie błędem w konsoli. */
            token.current = null;
          },
          "before-interactive-callback": () => setInteractive(true),
        });
      })
      .catch(() => {
        /* Skrypt się nie wczytał — wysyłka pokaże komunikat o weryfikacji. */
      });

    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
      token.current = null;
    };
  }, [siteKey]);

  useImperativeHandle(
    ref,
    () => ({
      token(timeoutMs = 10_000) {
        if (token.current) return Promise.resolve(token.current);
        if (!siteKey) return Promise.resolve(null);
        return new Promise<string | null>((resolve) => {
          const done = (t: string) => {
            clearTimeout(timer);
            resolve(t);
          };
          const timer = setTimeout(() => {
            waiting.current = waiting.current.filter((w) => w !== done);
            resolve(null);
          }, timeoutMs);
          waiting.current.push(done);
        });
      },
      reset() {
        token.current = null;
        if (widgetId.current) window.turnstile?.reset(widgetId.current);
      },
    }),
    [siteKey],
  );

  return <div ref={box} className={interactive ? "mt-6" : undefined} />;
}
