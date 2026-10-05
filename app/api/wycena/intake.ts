import { uploadLimits } from "@/lib/content";
import {
  fileExtension,
  fileTypeFromName,
  isValidDescription,
  isValidEmail,
  isValidLocation,
  isValidName,
  isValidPhone,
  isValidReference,
  isValidSubmissionId,
  normalizeText,
  projectTypeLabel,
  type LeadAttachment,
  type LeadSubmission,
} from "@/lib/lead";
import { clientIp } from "./rate-limit";
import { verifyTurnstileToken } from "./turnstile";

/**
 * Wejście API wyceny: odczyt żądania, sygnały antyspamowe i walidacja.
 * Na wyjściu jest jeden LeadSubmission albo odmowa bez szczegółów.
 */

/* ---------------------------------------------------------------- *
 * Odczyt
 * ---------------------------------------------------------------- */

/* Vercel przyjmuje body do 4.5 MB. Załączniki mają łącznie 3.5 MB
   (lib/content.ts), reszta to pola i narzut multipart. */
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

export async function readForm(req: Request): Promise<FormData | "too_large" | "invalid"> {
  if (Number(req.headers.get("content-length")) > MAX_REQUEST_BYTES) return "too_large";
  try {
    return await req.formData();
  } catch {
    return "invalid";
  }
}

/* ---------------------------------------------------------------- *
 * Antyspam — tanie sygnały, zanim serwer zacznie czytać pliki
 * ---------------------------------------------------------------- */

/* Limit zapytań: reguła Vercel WAF (poza kodem) + lokalny licznik w rate-limit.ts. */

const MIN_FILL_MS = 3000;

export function looksLikeSpam(form: FormData) {
  /* Honeypot: pole, którego człowiek nie wypełnia. */
  if (normalizeText(form.get("firma"))) return true;

  /* Pułapka czasowa to tylko heurystyka — `ts` wysyła przeglądarka, więc
     bot może go podrobić. Odsiewa najprostsze skrypty, nie zastępuje Turnstile. */
  const startedAt = Number(form.get("ts"));
  return !startedAt || Date.now() - startedAt < MIN_FILL_MS;
}

/**
 * Cloudflare Turnstile (turnstile.ts): Siteverify z wiązaniem akcji
 * „wycena” i hosta z TURNSTILE_ALLOWED_HOSTNAMES. Działa „fail closed”.
 * Token jest jednorazowy i ważny 5 minut; po każdej nieudanej wysyłce
 * formularz pobiera nowy.
 */
export function verifyTurnstile(req: Request, token: FormDataEntryValue | null) {
  return verifyTurnstileToken(token, clientIp(req), {
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
    TURNSTILE_ALLOWED_HOSTNAMES: process.env.TURNSTILE_ALLOWED_HOSTNAMES,
    VERCEL_ENV: process.env.VERCEL_ENV,
  });
}

/* ---------------------------------------------------------------- *
 * Walidacja → LeadSubmission
 * ---------------------------------------------------------------- */

/** null = dane nie przeszły. Klient dostaje wtedy tylko kod błędu. */
export async function validateLead(form: FormData): Promise<LeadSubmission | null> {
  const name = normalizeText(form.get("imie"));
  const phone = normalizeText(form.get("telefon"));
  const email = normalizeText(form.get("email"));
  const location = normalizeText(form.get("lokalizacja"));
  const description = normalizeText(form.get("opis"), { multiline: true });
  const reference = normalizeText(form.get("realizacja"));
  const projectType = projectTypeLabel(normalizeText(form.get("typ")));
  /* Klucz idempotencji z przeglądarki — wymagany i sprawdzany ściśle, bez
     normalizacji. Trafia wyłącznie do payloadu Google, nigdzie więcej. */
  const submissionId = form.get("submissionId");

  const valid =
    isValidSubmissionId(submissionId) &&
    projectType !== null &&
    isValidName(name) &&
    isValidPhone(phone) &&
    (email === "" || isValidEmail(email)) &&
    isValidLocation(location) &&
    isValidDescription(description) &&
    isValidReference(reference) &&
    form.get("zgoda") === "on";
  if (!valid) return null;

  const attachments = await readAttachments(form.getAll("pliki"));
  if (!attachments) return null;

  return {
    name,
    phone,
    email: email || null,
    projectType,
    location,
    description,
    reference: reference || null,
    attachments,
    submittedAt: new Date().toISOString(),
    submissionId: submissionId.toLowerCase(),
  };
}

/** Liczba, rozmiar, rozszerzenie i realny typ. Pliki nie są nigdzie zapisywane. */
async function readAttachments(entries: FormDataEntryValue[]): Promise<LeadAttachment[] | null> {
  const files = entries.filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (files.length > uploadLimits.maxFiles) return null;

  const out: LeadAttachment[] = [];
  let total = 0;

  for (const file of files) {
    total += file.size;
    if (file.size > uploadLimits.maxFileBytes || total > uploadLimits.maxTotalBytes) return null;

    const type = fileTypeFromName(file.name);
    if (!type) return null;

    /* Content-Type i rozszerzenie można wpisać dowolne — treść musi się zgadzać. */
    const data = new Uint8Array(await file.arrayBuffer());
    if (sniff(data) !== type) return null;

    out.push({ filename: safeFileName(file.name), contentType: type, size: file.size, data });
  }
  return out;
}

function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Bez ścieżki i znaków spoza liter, cyfr i prostej interpunkcji; rozszerzenie zostaje. */
function safeFileName(name: string) {
  const base = normalizeText(name)
    .replace(/^.*[\\/]/, "")
    .replace(/\.[^.]*$/, "")
    .replace(/[^\p{L}\p{N} ._()-]+/gu, "_")
    .replace(/^[.\s]+/, "")
    .slice(0, 80);
  return `${base || "zalacznik"}.${fileExtension(name)}`;
}
