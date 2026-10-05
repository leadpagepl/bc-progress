/* Testy offline weryfikacji Turnstile (akcja i host) oraz tego, że odrzucona
   weryfikacja zatrzymuje trasę przed Google i Resend. fetch jest podmieniony. */
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  checkSiteverify,
  parseAllowedHostnames,
  TURNSTILE_ACTION,
  verifyTurnstileToken,
} from "../app/api/wycena/turnstile.ts";

const SECRET = "0x4AAAAAAAREALsecretVALUExxxxxxxxxx";
const TOKEN = "TOKEN.abc123.turnstile";
const IP = "203.0.113.77";
const HOST = "bc-progress.vercel.app";
const ENV = { TURNSTILE_SECRET_KEY: SECRET, TURNSTILE_ALLOWED_HOSTNAMES: HOST, VERCEL_ENV: "production" };
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const realFetch = globalThis.fetch;
const realConsole = { error: console.error, warn: console.warn, info: console.info, log: console.log };
let calls;
let logs;

const siteverify = (body, status = 200) => async (url, init) => {
  calls.push({ url: String(url), init });
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
};
const ok = (extra = {}) => ({ success: true, action: TURNSTILE_ACTION, hostname: HOST, "error-codes": [], ...extra });

beforeEach(() => {
  calls = [];
  logs = [];
  for (const level of Object.keys(realConsole)) console[level] = (...args) => logs.push(args.join(" "));
});

afterEach(() => {
  globalThis.fetch = realFetch;
  Object.assign(console, realConsole);
  const all = logs.join("\n");
  for (const forbidden of [TOKEN, SECRET, IP, "Jan Testowy", "600100200"]) {
    assert.ok(!all.includes(forbidden), `log zawiera „${forbidden}”: ${all}`);
  }
});

/* ---------------------------------------------------------------- *
 * Lista hostów
 * ---------------------------------------------------------------- */

test("lista hostów: poprawne wpisy, przycięte i małymi literami", () => {
  assert.deepEqual([...parseAllowedHostnames(HOST)], [HOST]);
  assert.deepEqual(
    [...parseAllowedHostnames(" bc-progress.vercel.app , Przyklad.PL,www.przyklad.pl ")],
    [HOST, "przyklad.pl", "www.przyklad.pl"],
  );
  assert.deepEqual([...parseAllowedHostnames("localhost")], ["localhost"]);
});

test("H. lista hostów: brak albo błędny wpis unieważnia całą konfigurację", () => {
  for (const bad of [
    undefined,
    "",
    "   ",
    "https://bc-progress.vercel.app",
    "bc-progress.vercel.app/",
    "bc-progress.vercel.app/path",
    "bc-progress.vercel.app:443",
    "*.vercel.app",
    "*",
    "bc-progress.vercel.app,",
    ",bc-progress.vercel.app",
    "bc-progress.vercel.app,,przyklad.pl",
    "bc-progress.vercel.app;przyklad.pl",
    "bc progress.vercel.app",
    "-bc.vercel.app",
    "bc-.vercel.app",
    "bc..vercel.app",
    ".vercel.app",
    "user@bc-progress.vercel.app",
    "bc-progress.vercel.app,https://przyklad.pl",
    "ｂc-progress.vercel.app",
  ]) {
    assert.equal(parseAllowedHostnames(bad), null, JSON.stringify(bad));
  }
});

/* ---------------------------------------------------------------- *
 * Wynik Siteverify
 * ---------------------------------------------------------------- */

test("checkSiteverify: dokładne porównania akcji i hosta", () => {
  const hosts = parseAllowedHostnames(HOST);
  assert.equal(checkSiteverify(ok(), hosts, "wycena"), "ok");
  assert.equal(checkSiteverify(ok({ hostname: "BC-PROGRESS.VERCEL.APP" }), hosts, "wycena"), "ok");
  assert.equal(checkSiteverify(ok({ success: "true" }), hosts, "wycena"), "not_success");
  assert.equal(checkSiteverify(null, hosts, "wycena"), "not_success");
  assert.equal(checkSiteverify(ok({ action: "Wycena" }), hosts, "wycena"), "action");
  assert.equal(checkSiteverify(ok({ action: "wycena " }), hosts, "wycena"), "action");
  assert.equal(checkSiteverify(ok({ hostname: ["bc-progress.vercel.app"] }), hosts, "wycena"), "hostname");
});

/* ---------------------------------------------------------------- *
 * verifyTurnstileToken
 * ---------------------------------------------------------------- */

test("A. success + akcja wycena + dozwolony host → PASS", async () => {
  globalThis.fetch = siteverify(ok());
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, SITEVERIFY);
  const sent = calls[0].init.body;
  assert.equal(sent.get("secret"), SECRET);
  assert.equal(sent.get("response"), TOKEN);
  assert.equal(sent.get("remoteip"), IP);
  assert.deepEqual(logs, []);
});

test("B. inna akcja → FAIL", async () => {
  globalThis.fetch = siteverify(ok({ action: "kontakt" }));
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false);
  assert.deepEqual(logs, ["[wycena] Turnstile: niezgodna akcja (kontakt) — zgłoszenie odrzucone"]);
});

test("B. akcja innej wielkości liter → FAIL", async () => {
  globalThis.fetch = siteverify(ok({ action: "WYCENA" }));
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false);
});

test("C. brak akcji → FAIL", async () => {
  const { action: _action, ...withoutAction } = ok();
  globalThis.fetch = siteverify(withoutAction);
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false);
  assert.deepEqual(logs, ["[wycena] Turnstile: niezgodna akcja ((brak lub nieprawidłowa)) — zgłoszenie odrzucone"]);
});

test("D. inny host → FAIL", async () => {
  globalThis.fetch = siteverify(ok({ hostname: "inna-strona.pl" }));
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false);
  assert.deepEqual(logs, [
    "[wycena] Turnstile: host spoza TURNSTILE_ALLOWED_HOSTNAMES (inna-strona.pl) — zgłoszenie odrzucone",
  ]);
});

test("E. host-podróbka → FAIL", async () => {
  for (const hostname of ["bc-progress.vercel.app.evil.com", "evil-bc-progress.vercel.app", "bc-progress.vercel.ap"]) {
    globalThis.fetch = siteverify(ok({ hostname }));
    assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false, hostname);
  }
});

test("F. subdomena niewpisana jawnie → FAIL", async () => {
  for (const hostname of ["www.bc-progress.vercel.app", "preview.bc-progress.vercel.app", "vercel.app"]) {
    globalThis.fetch = siteverify(ok({ hostname }));
    assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false, hostname);
  }
});

test("G. brak hosta → FAIL", async () => {
  const { hostname: _hostname, ...withoutHost } = ok();
  globalThis.fetch = siteverify(withoutHost);
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false);
  globalThis.fetch = siteverify(ok({ hostname: "" }));
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false);
});

test("H. brak lub błędna lista hostów → FAIL CLOSED bez wołania Siteverify", async () => {
  for (const TURNSTILE_ALLOWED_HOSTNAMES of [undefined, "", "*.vercel.app", "https://bc-progress.vercel.app"]) {
    calls = [];
    globalThis.fetch = siteverify(ok());
    assert.equal(await verifyTurnstileToken(TOKEN, IP, { ...ENV, TURNSTILE_ALLOWED_HOSTNAMES }), false);
    assert.equal(calls.length, 0);
  }
  assert.ok(logs.every((l) => l === "[wycena] Turnstile: brak lub błędna TURNSTILE_ALLOWED_HOSTNAMES — zgłoszenie odrzucone"));
});

test("I. lista po przecinku → PASS dla każdego wpisanego hosta", async () => {
  const env = { ...ENV, TURNSTILE_ALLOWED_HOSTNAMES: `${HOST}, przyklad.pl ,www.przyklad.pl` };
  for (const hostname of [HOST, "przyklad.pl", "www.przyklad.pl"]) {
    globalThis.fetch = siteverify(ok({ hostname }));
    assert.equal(await verifyTurnstileToken(TOKEN, IP, env), true, hostname);
  }
  globalThis.fetch = siteverify(ok({ hostname: "sklep.przyklad.pl" }));
  assert.equal(await verifyTurnstileToken(TOKEN, IP, env), false);
});

test("dotychczasowe przypadki nadal fail closed", async () => {
  globalThis.fetch = siteverify(ok());
  assert.equal(await verifyTurnstileToken(TOKEN, IP, { ...ENV, TURNSTILE_SECRET_KEY: undefined }), false);
  for (const token of [null, "", 42, "x".repeat(2049)]) {
    assert.equal(await verifyTurnstileToken(token, IP, ENV), false);
  }
  assert.equal(calls.length, 0);

  globalThis.fetch = siteverify({ success: false, "error-codes": ["timeout-or-duplicate"] });
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false);
  globalThis.fetch = siteverify(ok(), 500);
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false);
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false);
  assert.ok(logs.includes("[wycena] Turnstile odrzucił zgłoszenie: HTTP 200 (timeout-or-duplicate)"));
  assert.ok(logs.includes("[wycena] Turnstile: brak połączenia z Siteverify"));
});

test("klucz testowy Cloudflare: odrzucony w Vercel Production, poza nią akcja „test” z localhost", async () => {
  const TEST_SECRET = "1x0000000000000000000000000000000AA";
  const dummy = { success: true, action: "test", hostname: "localhost" };

  globalThis.fetch = siteverify(dummy);
  assert.equal(
    await verifyTurnstileToken(TOKEN, IP, { TURNSTILE_SECRET_KEY: TEST_SECRET, TURNSTILE_ALLOWED_HOSTNAMES: "localhost", VERCEL_ENV: "production" }),
    false,
  );
  assert.equal(calls.length, 0);

  for (const VERCEL_ENV of ["preview", undefined]) {
    assert.equal(
      await verifyTurnstileToken(TOKEN, IP, { TURNSTILE_SECRET_KEY: TEST_SECRET, TURNSTILE_ALLOWED_HOSTNAMES: "localhost", VERCEL_ENV }),
      true,
    );
  }
  /* Klucz testowy nie zwalnia z listy hostów. */
  assert.equal(
    await verifyTurnstileToken(TOKEN, IP, { TURNSTILE_SECRET_KEY: TEST_SECRET, TURNSTILE_ALLOWED_HOSTNAMES: HOST, VERCEL_ENV: "preview" }),
    false,
  );
  /* Prawdziwy sekret nie przyjmuje akcji „test”. */
  globalThis.fetch = siteverify({ success: true, action: "test", hostname: HOST });
  assert.equal(await verifyTurnstileToken(TOKEN, IP, ENV), false);
});

/* ---------------------------------------------------------------- *
 * J. Trasa: odrzucony Turnstile nie dochodzi do Google ani Resend
 * ---------------------------------------------------------------- */

process.env.TURNSTILE_SECRET_KEY = SECRET;
process.env.TURNSTILE_ALLOWED_HOSTNAMES = HOST;
process.env.VERCEL_ENV = "production";
const { POST } = await import("../app/api/wycena/route.ts");

let ipCounter = 10;
function leadRequest() {
  const fd = new FormData();
  fd.set("typ", "dom");
  fd.set("lokalizacja", "Testowo");
  fd.set("opis", "Opis testowy");
  fd.set("imie", "Jan Testowy");
  fd.set("telefon", "600100200");
  fd.set("email", "");
  fd.set("zgoda", "on");
  fd.set("ts", String(Date.now() - 10_000));
  fd.set("firma", "");
  fd.set("cf-turnstile-response", TOKEN);
  fd.set("submissionId", "0b6f3c1e-7a55-4c0b-9a57-2f1f0c9d1e11");
  return new Request("https://example.test/api/wycena", {
    method: "POST",
    body: fd,
    headers: { "x-real-ip": `198.51.100.${ipCounter++}` },
  });
}

/** Siteverify odpowiada `body`; każde inne żądanie jest zapisywane i odrzucane. */
function mockNetwork(body) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url) === SITEVERIFY) {
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`nieoczekiwane wywołanie: ${new URL(String(url)).host}`);
  };
}

test("J. odrzucony Turnstile: 403 i żadnego wywołania Google ani Resend", async () => {
  /* Integracje skonfigurowane — gdyby trasa przeszła dalej, wywołałaby je. */
  process.env.GOOGLE_LEADS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbTESTxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec";
  process.env.GOOGLE_LEADS_WEBHOOK_SECRET = "google-secret";
  process.env.RESEND_API_KEY = "re_test";
  process.env.CONTACT_TO = "biuro@example.com";
  process.env.CONTACT_FROM = "formularz@example.com";
  try {
    for (const body of [
      { success: false, "error-codes": ["invalid-input-response"] },
      ok({ action: "inna" }),
      ok({ hostname: "bc-progress.vercel.app.evil.com" }),
      { success: true },
    ]) {
      calls = [];
      mockNetwork(body);
      const res = await POST(leadRequest());
      assert.equal(res.status, 403);
      assert.deepEqual(await res.json(), { ok: false, code: "VERIFICATION_FAILED" });
      assert.deepEqual(calls.map((c) => c.url), [SITEVERIFY], JSON.stringify(body));
    }
  } finally {
    for (const k of ["GOOGLE_LEADS_WEBHOOK_URL", "GOOGLE_LEADS_WEBHOOK_SECRET", "RESEND_API_KEY", "CONTACT_TO", "CONTACT_FROM"]) {
      delete process.env[k];
    }
  }
});

test("J. kontrola: poprawny Turnstile przechodzi dalej (tu do braku konfiguracji Google)", async () => {
  mockNetwork(ok());
  const res = await POST(leadRequest());
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { ok: false, code: "SERVICE_UNAVAILABLE" });
  assert.deepEqual(calls.map((c) => c.url), [SITEVERIFY]);
});
