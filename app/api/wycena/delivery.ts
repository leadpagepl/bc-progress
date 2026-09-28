import type { LeadSubmission } from "@/lib/lead";

/**
 * Integracje API wyceny. Każdy adapter dostaje gotowy, zwalidowany
 * LeadSubmission i nic nie wie o żądaniu HTTP.
 */

export type DeliveryResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" };

/* Lokalny tryb testowy: LEAD_DRY_RUN=1 udaje udaną wysyłkę bez wywołania
   Resend. W buildzie produkcyjnym jest ignorowany, żeby na Vercel nie połknąć
   prawdziwego zapytania. */
const dryRun = process.env.LEAD_DRY_RUN === "1" && process.env.NODE_ENV !== "production";

/**
 * E-mail z zapytaniem przez REST API Resend.
 * Wymaga RESEND_API_KEY, CONTACT_TO i CONTACT_FROM — bez nich nic nie wysyła
 * i zwraca `not_configured`.
 */
export async function sendLeadEmail(lead: LeadSubmission): Promise<DeliveryResult> {
  if (dryRun) {
    console.info(`[wycena] LEAD_DRY_RUN: e-mail pominięty, załączniki: ${lead.attachments.length}`);
    return { ok: true };
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM;
  if (!key || !to || !from) return { ok: false, reason: "not_configured" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        /* Imię przeszło normalizację jednowierszową, a e-mail walidację, więc
           żadne z nich nie wniesie CR/LF do nagłówków Subject i Reply-To. */
        reply_to: lead.email ?? undefined,
        subject: `Zapytanie o wycenę od ${lead.name}`,
        text: emailText(lead),
        attachments: lead.attachments.length
          ? lead.attachments.map((a) => ({
              filename: a.filename,
              content: Buffer.from(a.data).toString("base64"),
            }))
          : undefined,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      /* Odpowiedź Resend zostaje na serwerze; w logu tylko status. */
      console.error(`[wycena] Resend odrzucił wiadomość: HTTP ${res.status}`);
      return { ok: false, reason: "failed" };
    }
    return { ok: true };
  } catch {
    console.error("[wycena] Brak odpowiedzi z Resend");
    return { ok: false, reason: "failed" };
  }
}

/**
 * TODO(faza 2): zapis leada w Google Sheets.
 * Adapter niewłączony — route.ts go nie wywołuje. Bez konfiguracji odpowiada
 * tak samo jak brakujący Resend.
 */
export async function saveLeadToSheet(_lead: LeadSubmission): Promise<DeliveryResult> {
  return { ok: false, reason: "not_configured" };
}

function emailText(lead: LeadSubmission) {
  return [
    `Rodzaj inwestycji: ${lead.projectType}`,
    `Lokalizacja: ${lead.location}`,
    lead.reference ? `Dotyczy realizacji: ${lead.reference}` : null,
    "",
    "Opis:",
    lead.description || "nie podano",
    "",
    `Imię: ${lead.name}`,
    `Telefon: ${lead.phone}`,
    `E-mail: ${lead.email ?? "nie podano"}`,
    "",
    `Załączniki: ${lead.attachments.length}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
