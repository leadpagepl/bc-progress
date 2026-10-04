import type { LeadSubmission } from "@/lib/lead";
import { callAppsScript } from "./apps-script";
import { leadEmailHtml, leadEmailSubject, leadEmailText, leadReplyTo } from "./lead-email";

/**
 * Integracje API wyceny. Każdy adapter dostaje gotowy, zwalidowany
 * LeadSubmission i nic nie wie o żądaniu HTTP.
 */

type DeliveryFailure = { ok: false; reason: "not_configured" | "failed" };
export type DeliveryResult = { ok: true } | DeliveryFailure;
/** Wynik zapisu w Google: przy sukcesie zwalidowany link do folderu z załącznikami
 *  i informacja, czy Apps Script rozpoznał ponowienie już zapisanego zgłoszenia. */
export type SheetResult =
  | { ok: true; duplicate: boolean; folderUrl: string | null }
  | DeliveryFailure;

/* ID folderu Drive: litery, cyfry, „-” i „_”. */
const DRIVE_FOLDER_PATH = /^\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]{10,200})\/?$/;

/* Surowa wartość musi już być czystym linkiem do folderu: dokładnie
   „https://drive.google.com/drive/…folders/<ID>”, samo ASCII, bez portu,
   loginu, spacji i znaków sterujących. Parser URL po cichu usuwa CR/LF
   i tabulatory, gubi domyślny port :443, mapuje znaki pełnej szerokości
   i rozwija „..” — takie wejścia odrzucamy, zamiast je normalizować.
   Query i fragment są dopuszczalne, ale nie trafiają do wyniku. */
const RAW_DRIVE_FOLDER_URL =
  /^https:\/\/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/[A-Za-z0-9_-]{10,200}\/?(?:[?#][A-Za-z0-9._~!$&'()*+,;=:@\/?#%-]*)?$/;

/**
 * Link do folderu z odpowiedzi webhooka — tylko https://drive.google.com
 * z adresem folderu. Link jest składany od nowa z samego ID, więc query,
 * fragment i dane logowania z odpowiedzi nie trafiają do maila.
 */
export function driveFolderUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500 || !RAW_DRIVE_FOLDER_URL.test(value)) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.hostname !== "drive.google.com") return null;
  if (url.username || url.password || url.port) return null;
  const id = DRIVE_FOLDER_PATH.exec(url.pathname)?.[1];
  return id ? `https://drive.google.com/drive/folders/${id}` : null;
}

/* Lokalny tryb testowy: LEAD_DRY_RUN=1 udaje udaną wysyłkę bez wywołania
   integracji. W buildzie produkcyjnym jest ignorowany, żeby na Vercel nie
   połknąć prawdziwego zapytania. */
const dryRun = process.env.LEAD_DRY_RUN === "1" && process.env.NODE_ENV !== "production";

/**
 * Powiadomienie e-mail o zapytaniu przez REST API Resend (szablon:
 * lead-email.ts). Dodatek do zapisu w Google — nie jest miejscem
 * przechowywania leadów. Odbiorca wyłącznie z CONTACT_TO.
 * Wymaga RESEND_API_KEY, CONTACT_TO i CONTACT_FROM — bez nich nic nie wysyła
 * i zwraca `not_configured`. `folderUrl` (z saveLeadToSheet) dodaje do maila
 * link do folderu z załącznikami; same pliki nadal są w załączniku.
 */
export async function sendLeadEmail(
  lead: LeadSubmission,
  folderUrl: string | null = null,
): Promise<DeliveryResult> {
  if (dryRun) {
    console.info(`[wycena] LEAD_DRY_RUN: e-mail pominięty, załączniki: ${lead.attachments.length}`);
    return { ok: true };
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM;
  if (!key || !to || !from) {
    console.error("[wycena] Resend nieskonfigurowany — powiadomienie pominięte");
    return { ok: false, reason: "not_configured" };
  }

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
        /* Imię przeszło normalizację jednowierszową, a e-mail walidację;
           lead-email.ts dodatkowo odcina CR/LF od Subject i Reply-To. */
        reply_to: leadReplyTo(lead),
        subject: leadEmailSubject(lead),
        html: leadEmailHtml(lead, folderUrl),
        text: leadEmailText(lead, folderUrl),
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
      /* Odpowiedź Resend zostaje na serwerze; w logu tylko status i nazwa
         błędu (np. validation_error) — bez treści, adresów i danych leada. */
      const data: unknown = await res.json().catch(() => null);
      const name = (data as { name?: unknown } | null)?.name;
      const safeName = typeof name === "string" && /^[a-z_]{1,40}$/.test(name) ? ` (${name})` : "";
      console.error(`[wycena] Resend odrzucił wiadomość: HTTP ${res.status}${safeName}`);
      return { ok: false, reason: "failed" };
    }
    return { ok: true };
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    console.error(`[wycena] ${timeout ? "Przekroczony czas odpowiedzi" : "Brak połączenia z"} Resend`);
    return { ok: false, reason: "failed" };
  }
}

/* Apps Script z zapisem plików na Drive potrafi odpowiadać ponad 15 s, a po
   przerwaniu i tak kończy zapis — krótszy limit dawał błąd w UI przy
   zapisanym leadzie. Pierwsza próba (POST + odczyt przekierowania) ma do 45 s,
   a jedyne ponowienie (po 404 na odczycie) mieści się w tym samym terminie
   50 s i rusza tylko, gdy zostało co najmniej 5 s — zwykle trafia na szybką
   odpowiedź `duplicate: true`. Turnstile (do 8 s) + 50 s mieści się w
   maxDuration z route.ts. */
const WEBHOOK_TIMING = { totalMs: 50_000, firstAttemptMs: 45_000, minRetryMs: 5_000 };

/**
 * Zapis leada przez webhook Google Apps Script: wiersz w Sheets, folder
 * z załącznikami na Drive, linki w arkuszu, Status = „Nowy”.
 *
 * Wymaga GOOGLE_LEADS_WEBHOOK_URL i GOOGLE_LEADS_WEBHOOK_SECRET (tylko po
 * stronie serwera). Sukces to wyłącznie HTTP OK z JSON `{ ok: true }` —
 * samo 200 nie wystarcza, bo Apps Script zwraca 200 także przy błędzie.
 */
export async function saveLeadToSheet(lead: LeadSubmission): Promise<SheetResult> {
  if (dryRun) {
    console.info(`[wycena] LEAD_DRY_RUN: zapis w Google pominięty, załączniki: ${lead.attachments.length}`);
    return { ok: true, duplicate: false, folderUrl: null };
  }

  const url = process.env.GOOGLE_LEADS_WEBHOOK_URL;
  const secret = process.env.GOOGLE_LEADS_WEBHOOK_SECRET;
  if (!url || !secret) return { ok: false, reason: "not_configured" };

  /* Walidacja adresu, POST, jawne przekierowanie ContentService, jedno
     ponowienie po 404 i wspólny termin: apps-script.ts. Sekret trafia
     wyłącznie do treści POST; ponowienie wysyła te same bajty. */
  const res = await callAppsScript(
    url,
    {
      secret,
      /* Klucz idempotencji: Apps Script pod blokadą sprawdza, czy ten ID
         jest już w arkuszu, i wtedy nie tworzy drugiego wiersza ani folderu. */
      submissionId: lead.submissionId,
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
    },
    WEBHOOK_TIMING,
  );
  if (!res.ok) return res;
  const { data } = res;

  /* Folder powstaje tylko przy załącznikach. Link, który nie przejdzie
     walidacji, jest pomijany — zapis w Google nadal liczy się jako sukces. */
  const rawFolderUrl = data.folderUrl;
  const folderUrl = lead.attachments.length ? driveFolderUrl(rawFolderUrl) : null;
  if (lead.attachments.length && rawFolderUrl && !folderUrl) {
    console.warn("[wycena] Apps Script zwrócił nieprawidłowy folderUrl — link pominięty");
  }

  /* Tylko jawne `true` oznacza ponowienie; brak pola albo inna wartość to
     nowe zgłoszenie. Duplikat to sukces — lead jest już w arkuszu. */
  const duplicate = data.duplicate === true;
  if (duplicate) console.info("[wycena] Apps Script: zgłoszenie już zapisane — ponowienie bez nowego wiersza");
  return { ok: true, duplicate, folderUrl };
}
