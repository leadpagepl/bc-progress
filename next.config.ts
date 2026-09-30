import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/* CSP bez nonce. Next.js wstawia do HTML inline <script> z danymi RSC,
   a next/image i komponenty renderują atrybuty style — stąd 'unsafe-inline'.
   Ścisły CSP (nonce) wymagałby middleware i renderowania dynamicznego.
   'unsafe-eval' tylko w dev: potrzebuje go React i webpack w trybie dev.
   frame-src: osadzona mapa Google (lib/content.ts → mapEmbedUrl).
   challenges.cloudflare.com: skrypt i iframe Turnstile w formularzu wyceny —
   dokładnie te dwie dyrektywy, których wymaga Cloudflare. */
const TURNSTILE = "https://challenges.cloudflare.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `frame-src https://www.google.com ${TURNSTILE}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

/* HSTS celowo pominięty: Vercel wysyła go sam dla domen produkcyjnych. */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920],
    /* Wymagane od Next 16: jawna lista jakości używanych w projekcie. */
    qualities: [75, 82],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
