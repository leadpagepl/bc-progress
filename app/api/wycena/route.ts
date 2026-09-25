import { NextResponse } from "next/server";
import { uploadLimits } from "@/lib/content";

export const runtime = "nodejs";

/**
 * Odbiór zapytania o wycenę.
 *
 * Wysyłka działa dopiero po ustawieniu zmiennych środowiskowych:
 *   RESEND_API_KEY, CONTACT_TO, CONTACT_FROM
 * Bez nich endpoint zwraca 501 i nie udaje, że wiadomość poszła.
 *
 * Załączniki nie są nigdzie zapisywane: lecą prosto w e-mailu, więc nie ma
 * katalogu z plikami, który mógłby wyciec.
 */

/* Prosty licznik w pamięci procesu. Zeruje się przy restarcie i nie działa
   między instancjami — wystarcza na odsianie prymitywnych botów, ale nie
   zastępuje limitera po stronie hostingu. */
const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

/* Nagłówek Content-Type można wpisać dowolny, więc typ pliku potwierdzamy
   jeszcze sygnaturą z pierwszych bajtów. */
function sniff(buf: Uint8Array): string | null {
  const b = buf;
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

function safeName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 80) || "zalacznik";
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "nieznane";

  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, code: "rate_limited" }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  /* Pułapka na boty: pole jest ukryte, człowiek go nie wypełni. */
  if (String(form.get("firma") ?? "").trim()) {
    return NextResponse.json({ ok: false, code: "spam" }, { status: 400 });
  }

  /* Formularz wypełniony w ułamku sekundy to nie człowiek. */
  const startedAt = Number(form.get("ts") ?? 0);
  if (!startedAt || Date.now() - startedAt < 3000) {
    return NextResponse.json({ ok: false, code: "spam" }, { status: 400 });
  }

  const typ = String(form.get("typ") ?? "").trim();
  const lokalizacja = String(form.get("lokalizacja") ?? "").trim();
  const opis = String(form.get("opis") ?? "").trim().slice(0, 4000);
  const imie = String(form.get("imie") ?? "").trim().slice(0, 120);
  const telefon = String(form.get("telefon") ?? "").trim().slice(0, 40);
  const email = String(form.get("email") ?? "").trim().slice(0, 160);
  const realizacja = String(form.get("realizacja") ?? "").trim().slice(0, 160);
  const zgoda = form.get("zgoda") === "on";

  const digits = (telefon.match(/\d/g) ?? []).length;
  const emailOk = email === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

  if (!typ || !lokalizacja || imie.length < 2 || digits < 9 || !emailOk || !zgoda) {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  /* Załączniki: liczba, rozmiar i realny typ. */
  const files = form.getAll("pliki").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > uploadLimits.maxFiles) {
    return NextResponse.json({ ok: false, code: "too_many_files" }, { status: 400 });
  }

  let total = 0;
  const attachments: { filename: string; content: string }[] = [];

  for (const file of files) {
    if (file.size > uploadLimits.maxFileBytes) {
      return NextResponse.json({ ok: false, code: "file_too_large" }, { status: 400 });
    }
    total += file.size;
    if (total > uploadLimits.maxTotalBytes) {
      return NextResponse.json({ ok: false, code: "files_too_large" }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const real = sniff(bytes.subarray(0, 16));
    if (!real || !(uploadLimits.accept as readonly string[]).includes(real)) {
      return NextResponse.json({ ok: false, code: "bad_file_type" }, { status: 400 });
    }

    attachments.push({
      filename: safeName(file.name),
      content: Buffer.from(bytes).toString("base64"),
    });
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM;

  if (!key || !to || !from) {
    return NextResponse.json({ ok: false, code: "not_configured" }, { status: 501 });
  }

  const lines = [
    `Rodzaj inwestycji: ${typ}`,
    `Lokalizacja: ${lokalizacja}`,
    realizacja ? `Dotyczy realizacji: ${realizacja}` : null,
    "",
    "Opis:",
    opis || "nie podano",
    "",
    `Imię: ${imie}`,
    `Telefon: ${telefon}`,
    `E-mail: ${email || "nie podano"}`,
    "",
    `Załączniki: ${attachments.length}`,
  ].filter(Boolean);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email || undefined,
      subject: `Zapytanie o wycenę od ${imie}`,
      text: lines.join("\n"),
      attachments: attachments.length ? attachments : undefined,
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ ok: false, code: "send_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
