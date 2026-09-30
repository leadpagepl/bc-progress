import { projectTypes, uploadLimits } from "@/lib/content";

/**
 * Zapytanie o wycenę — reguły wspólne dla formularza i API.
 *
 * Przeglądarka sprawdza dane dla wygody, serwer (app/api/wycena) decyduje.
 * Obie strony wołają te same funkcje, więc limity się nie rozjadą.
 */

export const leadLimits = {
  name: { min: 2, max: 120 },
  phone: { max: 40, minDigits: 9, maxDigits: 15 },
  email: { max: 160 },
  location: { min: 2, max: 120 },
  description: { max: 4000 },
  reference: { max: 160 },
} as const;

export type LeadAttachment = {
  filename: string;
  contentType: string;
  size: number;
  data: Uint8Array;
};

/** Zapytanie po walidacji. Ten sam obiekt trafia do e-maila, a w fazie 2 do arkusza. */
export type LeadSubmission = {
  name: string;
  phone: string;
  email: string | null;
  /** Etykieta z `projectTypes`, np. „Dom”. */
  projectType: string;
  location: string;
  description: string;
  /** Realizacja, przy której otwarto formularz. */
  reference: string | null;
  attachments: LeadAttachment[];
  submittedAt: string;
  /** UUID v4 (małe litery) jednego logicznego zgłoszenia — ten sam przy
   *  każdym ponowieniu, więc Apps Script nie zapisze leada drugi raz. */
  submissionId: string;
};

/* C0 i C1 bez \t i \n oraz znaki sterujące kierunkiem tekstu — te potrafią
   przestawić treść w podglądzie maila. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F‪-‮⁦-⁩]/g;

/**
 * NFC, bez znaków sterujących, przycięte. Pole jednowierszowe dostaje
 * pojedyncze spacje, co usuwa też CR/LF — wartość jest bezpieczna w nagłówku
 * maila. Opis zachowuje akapity, znikają tylko ciągi pustych linii.
 */
export function normalizeText(value: unknown, { multiline = false } = {}): string {
  if (typeof value !== "string") return "";
  const s = value.normalize("NFC").replace(/\r\n?/g, "\n").replace(CONTROL, "");
  return (
    multiline
      ? s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n")
      : s.replace(/\s+/g, " ")
  ).trim();
}

const within = (v: string, { min = 0, max }: { min?: number; max: number }) =>
  v.length >= min && v.length <= max;

export const isValidName = (v: string) => within(v, leadLimits.name);
export const isValidLocation = (v: string) => within(v, leadLimits.location);
export const isValidDescription = (v: string) => within(v, leadLimits.description);
export const isValidReference = (v: string) => within(v, leadLimits.reference);

/* Rozsądny podzbiór, nie pełny RFC: bez spacji, CR/LF, przecinków, cudzysłowów
   i nawiasów, bo adres trafia do nagłówka Reply-To. */
const EMAIL =
  /^[A-Za-z0-9_%+-]+(?:\.[A-Za-z0-9_%+-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

export function isValidEmail(v: string) {
  return v.length <= leadLimits.email.max && v.indexOf("@") <= 64 && EMAIL.test(v);
}

/** Cyfry, spacje, myślniki, nawiasy i „+” na początku. */
const PHONE = /^\+?[\d ()-]+$/;

export function isValidPhone(v: string) {
  const { max, minDigits, maxDigits } = leadLimits.phone;
  const digits = v.replace(/\D/g, "").length;
  return v.length <= max && PHONE.test(v) && digits >= minDigits && digits <= maxDigits;
}

/* UUID v4: wersja 4 i wariant RFC 4122 (8, 9, a, b). Kotwice wykluczają
   dłuższe wartości, spacje i znaki sterujące. */
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidSubmissionId(v: unknown): v is string {
  return typeof v === "string" && UUID_V4.test(v);
}

/** Allowlista: przyjmujemy wyłącznie identyfikatory z `projectTypes`. */
export function projectTypeLabel(id: string): string | null {
  return projectTypes.find((t) => t.id === id)?.label ?? null;
}

export function fileExtension(name: string): string {
  return /\.([a-z0-9]+)$/i.exec(name)?.[1].toLowerCase() ?? "";
}

/** Typ wynikający z rozszerzenia albo null, gdy rozszerzenie nie jest dozwolone. */
export function fileTypeFromName(name: string): string | null {
  const type = (uploadLimits.types as Record<string, unknown>)[fileExtension(name)];
  return typeof type === "string" ? type : null;
}

/** Kontrola w przeglądarce: rozszerzenie i deklarowany typ. Serwer
 *  potwierdza typ jeszcze sygnaturą z pierwszych bajtów pliku. */
export function isAcceptedFile(file: { name: string; type: string }) {
  const expected = fileTypeFromName(file.name);
  return expected !== null && (file.type === "" || file.type === expected);
}
