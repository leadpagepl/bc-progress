import { company } from "@/lib/content";
import type { LeadSubmission } from "@/lib/lead";

/**
 * Powiadomienie e-mail o nowym zapytaniu — wersja HTML i tekstowa.
 *
 * HTML jest pisany pod klienty pocztowe (Gmail, Outlook, Apple Mail):
 * tabele, style inline, bezpieczny stos fontów, zero obrazków i skryptów.
 * Kolory to tokeny strony z app/globals.css. Każda wartość z formularza
 * przechodzi przez escapeHtml() przed wstawieniem do HTML.
 */

const C = {
  graphite: "#191A19",
  bone: "#F5F3EC",
  bone2: "#EAE7DD",
  yellow: "#FFD21C",
  grey: "#8E908A",
  white: "#FFFFFF",
} as const;

const FONT = "Arial, Helvetica, sans-serif";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* Wartości trafiające do nagłówków są już jednowierszowe po normalizacji;
   to drugi, niezależny bezpiecznik przed CR/LF. */
const oneLine = (v: string) => v.replace(/[\r\n]+/g, " ").trim();

/** `tel:` tylko z cyfr i jednego „+” na początku — nigdy z surowego wpisu. */
function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `tel:${phone.trim().startsWith("+") ? "+" : ""}${digits}`;
}

function plikow(n: number) {
  if (n === 1) return "plik";
  const r10 = n % 10;
  const r100 = n % 100;
  return r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? "pliki" : "plików";
}

function submittedLabel(iso: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
  }).format(new Date(iso));
}

function attachmentsSummary(n: number) {
  return `${n} ${plikow(n)} w załączniku tej wiadomości. Kopie są w folderze zgłoszenia na Google Drive.`;
}

export function leadEmailSubject(lead: LeadSubmission) {
  return oneLine(`Nowe zapytanie | ${company.shortName} | ${lead.name}`);
}

/** Reply-To tylko dla zwalidowanego adresu bez CR/LF; w innym razie brak nagłówka. */
export function leadReplyTo(lead: LeadSubmission) {
  return lead.email && !/[\r\n]/.test(lead.email) ? lead.email : undefined;
}

export function leadEmailText(lead: LeadSubmission) {
  const n = lead.attachments.length;
  return [
    `NOWE ZAPYTANIE ZE STRONY — ${company.shortName}`,
    submittedLabel(lead.submittedAt),
    "",
    `Imię: ${lead.name}`,
    `Telefon: ${lead.phone}`,
    lead.email ? `E-mail: ${lead.email}` : null,
    `Typ inwestycji: ${lead.projectType}`,
    `Lokalizacja: ${lead.location}`,
    lead.reference ? `Dotyczy realizacji: ${lead.reference}` : null,
    lead.description ? `\nOpis:\n${lead.description}` : null,
    n ? `\nZałączniki: ${attachmentsSummary(n)}` : null,
    "",
    "—",
    company.name,
    "Zapytanie wysłane przez formularz strony internetowej.",
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export function leadEmailHtml(lead: LeadSubmission) {
  const e = escapeHtml;
  const n = lead.attachments.length;

  const label = (text: string) =>
    `<p style="margin:0 0 6px;font-family:${FONT};font-size:11px;line-height:16px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${C.grey};">${text}</p>`;
  const value = (html: string) =>
    `<p style="margin:0;font-family:${FONT};font-size:16px;line-height:24px;color:${C.graphite};">${html}</p>`;
  const field = (name: string, html: string) =>
    `<tr><td style="padding:18px 0;border-top:1px solid ${C.bone2};">${label(name)}${html}</td></tr>`;

  const rows = [
    field(
      "Telefon",
      value(
        `<a href="${e(telHref(lead.phone))}" style="color:${C.graphite};font-size:20px;font-weight:bold;text-decoration:none;border-bottom:2px solid ${C.yellow};">${e(lead.phone)}</a>`,
      ),
    ),
    lead.email
      ? field(
          "E-mail",
          value(
            `<a href="mailto:${e(lead.email)}" style="color:${C.graphite};text-decoration:underline;">${e(lead.email)}</a>`,
          ),
        )
      : "",
    field("Typ inwestycji", value(e(lead.projectType))),
    field("Lokalizacja", value(e(lead.location))),
    lead.reference ? field("Dotyczy realizacji", value(e(lead.reference))) : "",
    lead.description
      ? field(
          "Opis",
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="border-left:3px solid ${C.yellow};padding:2px 0 2px 16px;">${value(
            /* Najpierw escape, dopiero potem <br> — kolejność ma znaczenie. */
            e(lead.description).replace(/\n/g, "<br>"),
          )}</td></tr></table>`,
        )
      : "",
    n
      ? field(
          "Załączniki",
          value(e(attachmentsSummary(n))) +
            `<p style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.grey};">${lead.attachments
              .map((a) => e(a.filename))
              .join("<br>")}</p>`,
        )
      : "",
  ].join("");

  const preheader = e(`${lead.projectType}, ${lead.location}`);

  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Nowe zapytanie</title>
</head>
<body style="margin:0;padding:0;background:${C.bone};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bone}" style="background:${C.bone};">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

<tr><td bgcolor="${C.graphite}" style="background:${C.graphite};padding:28px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="20" height="20" bgcolor="${C.yellow}" style="width:20px;height:20px;background:${C.yellow};font-size:0;line-height:0;">&nbsp;</td>
<td style="padding-left:12px;font-family:${FONT};font-size:20px;line-height:20px;font-weight:bold;letter-spacing:1px;color:${C.bone};">BC<span style="color:${C.yellow};">&middot;P</span>ROGRES</td>
</tr></table>
<p style="margin:18px 0 0;font-family:${FONT};font-size:11px;line-height:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${C.grey};">Nowe zapytanie ze strony</p>
</td></tr>

<tr><td bgcolor="${C.white}" style="background:${C.white};padding:36px 32px 18px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td bgcolor="${C.yellow}" style="background:${C.yellow};padding:6px 10px;font-family:${FONT};font-size:11px;line-height:14px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:${C.graphite};">Nowe zapytanie</td>
</tr></table>
<p style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.grey};">${e(submittedLabel(lead.submittedAt))}</p>
<h1 style="margin:10px 0 26px;font-family:${FONT};font-size:28px;line-height:34px;font-weight:bold;color:${C.graphite};">${e(lead.name)}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr>

<tr><td style="padding:24px 32px 8px;">
<p style="margin:0;font-family:${FONT};font-size:13px;line-height:18px;font-weight:bold;color:${C.graphite};">${e(company.name)}</p>
<p style="margin:6px 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.grey};">Zapytanie wysłane przez formularz strony internetowej.${
    leadReplyTo(lead) ? " Odpowiedź na tę wiadomość trafi bezpośrednio do nadawcy." : ""
  }</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
