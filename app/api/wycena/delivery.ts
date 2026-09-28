import type { LeadSubmission } from "@/lib/lead";

/**
 * Integracje API wyceny. Każdy adapter dostaje gotowy, zwalidowany
 * LeadSubmission i nic nie wie o żądaniu HTTP.
 */

export type DeliveryResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" };

/* Lokalny tryb testowy: LEAD_DRY_RUN=1 udaje udaną wysyłkę bez wywołania
   integracji. W buildzie produkcyjnym jest ignorowany, żeby na Vercel nie
   połknąć prawdziwego zapytania. */
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

const WEBHOOK_TIMEOUT_MS = 15_000;

/**
 * Zapis leada przez webhook Google Apps Script: wiersz w Sheets, folder
 * z załącznikami na Drive, linki w arkuszu, Status = „Nowy”.
 *
 * Wymaga GOOGLE_LEADS_WEBHOOK_URL i GOOGLE_LEADS_WEBHOOK_SECRET (tylko po
 * stronie serwera). Sukces to wyłącznie HTTP OK z JSON `{ ok: true }` —
 * samo 200 nie wystarcza, bo Apps Script zwraca 200 także przy błędzie.
 */
export async function saveLeadToSheet(lead: LeadSubmission): Promise<DeliveryResult> {
  if (dryRun) {
    console.info(`[wycena] LEAD_DRY_RUN: zapis w Google pominięty, załączniki: ${lead.attachments.length}`);
    return { ok: true };
  }

  const url = process.env.GOOGLE_LEADS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_LEADS_WEBHOOK_SECRET;
  if (!url || !secret) return { ok: false, reason: "not_configured" };

  try {
    /* Apps Script odpowiada przekierowaniem na googleusercontent.com z wynikiem
       doPost — fetch podąża za nim sam. */
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        name: lead.name,
        phone: lead.phone,
        email: lead.email ?? "",
        projectType: lead.projectType,
        location: lead.location,
        description: lead.description,
        realization: lead.reference ?? "",
        attachments: lead.attachments.map((a) => ({
          name: a.filename,
          mimeType: a.contentType,
          base64: Buffer.from(a.data).toString("base64"),
        })),
      }),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    const data: unknown = await res.json().catch(() => null);
    const ok = typeof data === "object" && data !== null && (data as { ok?: unknown }).ok === true;
    if (!res.ok || !ok) {
      /* Treść odpowiedzi zostaje na serwerze; w logu tylko status i krótki kod. */
      const code = (data as { code?: unknown } | null)?.code;
      const safeCode = typeof code === "string" && /^[\w-]{1,40}$/.test(code) ? ` (${code})` : "";
      console.error(`[wycena] Apps Script nie zapisał zgłoszenia: HTTP ${res.status}${safeCode}`);
      return { ok: false, reason: "failed" };
    }
    return { ok: true };
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    console.error(`[wycena] ${timeout ? "Przekroczony czas odpowiedzi" : "Brak połączenia z"} Apps Script`);
    return { ok: false, reason: "failed" };
  }
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
