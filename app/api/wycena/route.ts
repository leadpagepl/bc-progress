import { after, NextResponse } from "next/server";
import { looksLikeSpam, rateLimited, readForm, validateLead, verifyTurnstile } from "./intake";
import { saveLeadToSheet, sendLeadEmail } from "./delivery";

export const runtime = "nodejs";

/* Jawny limit funkcji na Vercel: Turnstile (do 8 s) + Apps Script (do 45 s)
   muszą się zmieścić, a domyślny limit bywa krótszy (10–15 s bez Fluid
   compute). 60 s to maksimum dozwolone na każdym planie. */
export const maxDuration = 60;

/**
 * Odbiór zapytania o wycenę.
 *
 *   odczyt → antyspam → walidacja (LeadSubmission) → Google Apps Script
 *   → (po odpowiedzi) powiadomienie Resend
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
  | "VERIFICATION_FAILED"
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

  if (looksLikeSpam(form)) return odmowa("SPAM", 400);

  /* Turnstile przed walidacją i przed Google/Resend: bez potwierdzenia
     serwer nie czyta plików i niczego nie zapisuje ani nie wysyła. */
  if (!(await verifyTurnstile(req, form.get("cf-turnstile-response")))) {
    return odmowa("VERIFICATION_FAILED", 403);
  }

  const lead = await validateLead(form);
  if (!lead) return odmowa("VALIDATION_ERROR", 400);

  /* Google to główny zapis — o sukcesie formularza decyduje wyłącznie on. */
  const saved = await saveLeadToSheet(lead);

  if (!saved.ok) {
    return saved.reason === "not_configured"
      ? odmowa("SERVICE_UNAVAILABLE", 503)
      : odmowa("DELIVERY_FAILED", 502);
  }

  /* Lead jest już w Sheets/Drive. E-mail to tylko powiadomienie: rusza po
     wysłaniu odpowiedzi, więc jego błąd ani timeout nie zmienią wyniku
     formularza. Porażkę loguje sendLeadEmail(). Link do folderu z plikami
     przychodzi z Google już zwalidowany (albo null).
     Ponowienie (`saved.duplicate`) też kończy się mailem: pierwsza próba mogła
     zapisać lead, ale urwać się przed after() — bez tego powiadomienie by
     nie dotarło. Przy duplikacie folderUrl bywa null, wtedy mail jest bez linku. */
  const { folderUrl } = saved;
  after(() => sendLeadEmail(lead, folderUrl));

  return NextResponse.json({ ok: true });
}
