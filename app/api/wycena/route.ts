import { NextResponse } from "next/server";
import { looksLikeSpam, rateLimited, readForm, validateLead, verifyTurnstile } from "./intake";
import { saveLeadToSheet } from "./delivery";

export const runtime = "nodejs";

/**
 * Odbiór zapytania o wycenę.
 *
 *   odczyt → antyspam → walidacja (LeadSubmission) → Google Apps Script
 *
 * Klient dostaje wyłącznie `{ ok: true }` albo `{ ok: false, code }`.
 * Bez GOOGLE_LEADS_WEBHOOK_URL i GOOGLE_LEADS_WEBHOOK_SECRET endpoint zwraca
 * SERVICE_UNAVAILABLE i nie udaje, że zgłoszenie zapisano.
 *
 * Załączniki trafiają wyłącznie do folderu zgłoszenia na Google Drive
 * (tworzy go Apps Script); serwer strony niczego nie zapisuje.
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

  /* Faza 2A: Google jest jedynym aktywnym kanałem — udany zapis wystarcza.
     sendLeadEmail() (Resend) czeka w delivery.ts, niewłączony. */
  const saved = await saveLeadToSheet(lead);

  if (!saved.ok) {
    return saved.reason === "not_configured"
      ? odmowa("SERVICE_UNAVAILABLE", 503)
      : odmowa("DELIVERY_FAILED", 502);
  }
  return NextResponse.json({ ok: true });
}
