import { NextResponse } from "next/server";
import { looksLikeSpam, rateLimited, readForm, validateLead, verifyTurnstile } from "./intake";
import { sendLeadEmail } from "./delivery";

export const runtime = "nodejs";

/**
 * Odbiór zapytania o wycenę.
 *
 *   odczyt → antyspam → walidacja (LeadSubmission) → integracje
 *
 * Klient dostaje wyłącznie `{ ok: true }` albo `{ ok: false, code }`.
 * Bez RESEND_API_KEY, CONTACT_TO i CONTACT_FROM endpoint zwraca
 * SERVICE_UNAVAILABLE i nie udaje, że wiadomość poszła.
 *
 * Załączniki nie są nigdzie zapisywane: lecą prosto w e-mailu, więc nie ma
 * katalogu z plikami, który mógłby wyciec.
 */

type ErrorCode =
  | "VALIDATION_ERROR"
  | "SPAM"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "DELIVERY_FAILED";

function odmowa(code: ErrorCode, status: number) {
  return NextResponse.json({ ok: false, code }, { status });
}

export async function POST(req: Request) {
  if (rateLimited(req)) return odmowa("RATE_LIMITED", 429);

  const form = await readForm(req);
  if (form === "too_large") return odmowa("VALIDATION_ERROR", 413);
  if (form === "invalid") return odmowa("VALIDATION_ERROR", 400);

  if (looksLikeSpam(form) || !(await verifyTurnstile(form.get("cf-turnstile-response")))) {
    return odmowa("SPAM", 400);
  }

  const lead = await validateLead(form);
  if (!lead) return odmowa("VALIDATION_ERROR", 400);

  const email = await sendLeadEmail(lead);
  /* TODO(faza 2): await saveLeadToSheet(lead) — adapter czeka w delivery.ts. */

  if (!email.ok) {
    return email.reason === "not_configured"
      ? odmowa("SERVICE_UNAVAILABLE", 503)
      : odmowa("DELIVERY_FAILED", 502);
  }
  return NextResponse.json({ ok: true });
}
