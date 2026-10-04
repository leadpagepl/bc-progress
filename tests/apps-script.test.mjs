/* Testy offline protokołu webhooka Apps Script. fetch jest podmieniony —
   żadne żądanie nie wychodzi do sieci. Uruchomienie: npm test */
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  appsScriptRedirectUrl,
  appsScriptWebhookUrl,
  callAppsScript,
} from "../app/api/wycena/apps-script.ts";

const DEPLOYMENT_ID = "AKfycbTESTdeploymentIDxxxxxxxxxxxxxxxxxxxxxxxx";
const WEBHOOK = `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`;
const TOKEN = "ONE_TIME_TOKEN_abc123";
const REDIRECT = `https://script.googleusercontent.com/macros/echo?user_content_key=${TOKEN}&lib=LIBxyz`;
const SECRET = "s3cr3t-webhook-value";
const SUBMISSION_ID = "0b6f3c1e-7a55-4c0b-9a57-2f1f0c9d1e11";
const PAYLOAD = { secret: SECRET, submissionId: SUBMISSION_ID, name: "Jan Testowy", phone: "600100200" };

const realFetch = globalThis.fetch;
const realConsole = { error: console.error, warn: console.warn, info: console.info, log: console.log };
let calls;
let logs;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const redirect = (location, status = 302) =>
  new Response(null, { status, headers: location === null ? {} : { location } });

/** Kolejne odpowiedzi dla kolejnych wywołań fetch; nadmiarowe wywołanie to błąd testu. */
function mockFetch(...responses) {
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error("nieoczekiwane wywołanie fetch");
    return typeof next === "function" ? next(init) : next;
  };
}

beforeEach(() => {
  calls = [];
  logs = [];
  for (const level of Object.keys(realConsole)) {
    console[level] = (...args) => logs.push(args.join(" "));
  }
});

afterEach(() => {
  globalThis.fetch = realFetch;
  Object.assign(console, realConsole);
  /* J. W żadnym scenariuszu log nie zawiera adresów, tokenów, sekretów ani ID. */
  const all = logs.join("\n");
  for (const forbidden of [
    "http",
    "script.google",
    "googleusercontent",
    "evil",
    DEPLOYMENT_ID,
    TOKEN,
    SECRET,
    SUBMISSION_ID,
    "Jan Testowy",
    "600100200",
    "plan.pdf",
    "JVBERi0",
  ]) {
    assert.ok(!all.includes(forbidden), `log zawiera „${forbidden}”: ${all}`);
  }
});

test("A. bezpośrednia odpowiedź 200 JSON", async () => {
  mockFetch(json({ ok: true }));
  const res = await callAppsScript(WEBHOOK, PAYLOAD, 1000);
  assert.deepEqual(res, { ok: true, data: { ok: true } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, WEBHOOK);
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].init.redirect, "manual");
  assert.equal(logs.length, 0);
});

test("B. przekierowanie ContentService", async () => {
  const folderUrl = "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv";
  mockFetch(redirect(REDIRECT), json({ ok: true, duplicate: false, folderUrl }));
  const res = await callAppsScript(WEBHOOK, PAYLOAD, 1000);
  assert.deepEqual(res, { ok: true, data: { ok: true, duplicate: false, folderUrl } });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, REDIRECT);
  assert.equal(calls[1].init.method, "GET");
  assert.equal(calls[1].init.redirect, "manual");
});

test("C. duplikat w odpowiedzi po przekierowaniu", async () => {
  mockFetch(redirect(REDIRECT), json({ ok: true, duplicate: true }));
  const res = await callAppsScript(WEBHOOK, PAYLOAD, 1000);
  assert.equal(res.ok, true);
  assert.equal(res.data.duplicate, true);
});

const BAD_REDIRECTS = [
  "https://evil.com/",
  "https://script.googleusercontent.com.evil.com/",
  "https://evil.script.googleusercontent.com/",
  "http://script.googleusercontent.com/",
  "https://user:pass@script.googleusercontent.com/",
  "https://user@script.googleusercontent.com/",
  "https://script.googleusercontent.com:444/",
  "https://script.googleusercontent.com:443/",
  "https://script.googleusercontent.com",
  "https://script.googleusercontent.com@evil.com/",
  "https://script.googleusercontent.com\\@evil.com/",
  "https://SCRIPT.googleusercontent.com/",
  "https://ｓcript.googleusercontent.com/",
  "https://script.googleusercontent.com./",
  "//script.googleusercontent.com/macros/echo",
  "//evil.com/",
  "/macros/echo?user_content_key=x",
  "https://script.googleusercontent.com/a b",
  "https://script.googleusercontent.com/\r\nx",
  " https://script.googleusercontent.com/",
  "javascript:alert(1)",
  "",
  null,
];

for (const location of BAD_REDIRECTS) {
  test(`D. niedozwolone przekierowanie: ${JSON.stringify(location)}`, async () => {
    assert.equal(appsScriptRedirectUrl(location), null);
    let headers;
    try {
      headers = redirect(location);
    } catch {
      return; /* wartość, której nie da się nawet umieścić w nagłówku */
    }
    /* Headers przycina białe znaki — taka wartość nie dotrze w tej postaci. */
    if (headers.headers.get("location") !== location) return;
    mockFetch(headers);
    const res = await callAppsScript(WEBHOOK, PAYLOAD, 1000);
    assert.deepEqual(res, { ok: false, reason: "failed" });
    assert.equal(calls.length, 1, "cel przekierowania nie może zostać pobrany");
  });
}

test("D. 307/308 nie są śledzone (bez ponownego POST)", async () => {
  for (const status of [307, 308]) {
    calls = [];
    mockFetch(redirect(REDIRECT, status));
    const res = await callAppsScript(WEBHOOK, PAYLOAD, 1000);
    assert.deepEqual(res, { ok: false, reason: "failed" });
    assert.equal(calls.length, 1);
  }
});

test("D. drugie przekierowanie nie jest śledzone", async () => {
  mockFetch(redirect(REDIRECT), redirect("https://evil.com/"));
  const res = await callAppsScript(WEBHOOK, PAYLOAD, 1000);
  assert.deepEqual(res, { ok: false, reason: "failed" });
  assert.equal(calls.length, 2);
});

const BAD_WEBHOOKS = [
  `http://script.google.com/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://evil.com/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://script.google.com.evil.com/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://evil.script.google.com/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://script.google.com/macros/s/${DEPLOYMENT_ID}/dev`,
  `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec/`,
  `https://script.google.com/macros/s/${DEPLOYMENT_ID}/../${DEPLOYMENT_ID}/exec`,
  `https://script.google.com/macros/s//exec`,
  `https://script.google.com/exec`,
  `https://user:pass@script.google.com/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://user@script.google.com/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://script.google.com:444/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://script.google.com:443/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec?x=1`,
  `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec?`,
  `https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec#frag`,
  `https://script.google.com@evil.com/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://SCRIPT.GOOGLE.COM/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://ｓcript.google.com/macros/s/${DEPLOYMENT_ID}/exec`,
  `https://script.google.com./macros/s/${DEPLOYMENT_ID}/exec`,
  `//script.google.com/macros/s/${DEPLOYMENT_ID}/exec`,
  ` ${WEBHOOK}`,
  `${WEBHOOK}\n`,
  "",
  undefined,
  null,
  42,
];

for (const url of BAD_WEBHOOKS) {
  test(`E. niedozwolony adres webhooka: ${JSON.stringify(url)}`, async () => {
    assert.equal(appsScriptWebhookUrl(url), null);
    mockFetch();
    const res = await callAppsScript(url, PAYLOAD, 1000);
    assert.deepEqual(res, { ok: false, reason: "not_configured" });
    assert.equal(calls.length, 0, "sekret nie może zostać wysłany");
    assert.equal(logs.length, 1);
  });
}

test("E. poprawny adres webhooka przechodzi", () => {
  assert.equal(appsScriptWebhookUrl(WEBHOOK)?.href, WEBHOOK);
  assert.equal(appsScriptRedirectUrl(REDIRECT)?.href, REDIRECT);
});

test("F. sekret tylko w treści pierwszego POST", async () => {
  mockFetch(redirect(REDIRECT), json({ ok: true }));
  await callAppsScript(WEBHOOK, PAYLOAD, 1000);
  const [post, get] = calls;

  assert.equal(post.url, WEBHOOK);
  assert.deepEqual(JSON.parse(post.init.body), PAYLOAD);
  assert.ok(!post.url.includes(SECRET));
  assert.deepEqual(post.init.headers, { "Content-Type": "application/json" });

  assert.equal(get.init.method, "GET");
  assert.equal(get.init.body, undefined);
  assert.equal(get.init.headers, undefined);
  const { signal: _signal, ...getInit } = get.init;
  const sent = get.url + JSON.stringify(getInit);
  assert.ok(!sent.includes(SECRET));
  assert.ok(!sent.includes(SUBMISSION_ID));
});

test("G. końcowe 404 bez czasu na ponowienie to bezpieczna porażka", async () => {
  /* Budżet 1000 ms jest krótszy niż domyślne minimum ponowienia (5 s). */
  mockFetch(redirect(REDIRECT), new Response("<html>Not Found</html>", { status: 404 }));
  const res = await callAppsScript(WEBHOOK, PAYLOAD, 1000);
  assert.deepEqual(res, { ok: false, reason: "failed" });
  assert.equal(calls.length, 2);
  assert.deepEqual(logs, [
    "[wycena] Apps Script nie potwierdził zapisu: HTTP 404, etap: odczyt odpowiedzi — za mało czasu na ponowienie",
  ]);
});

test("G. 404/500 z samego POST", async () => {
  mockFetch(json({ ok: true }, 500));
  assert.deepEqual(await callAppsScript(WEBHOOK, PAYLOAD, 1000), { ok: false, reason: "failed" });
  assert.deepEqual(logs, ["[wycena] Apps Script nie potwierdził zapisu: HTTP 500, etap: POST"]);
});

test("H. odpowiedź nie-JSON i JSON bez ok:true", async () => {
  for (const body of [
    new Response("<html>ok</html>", { status: 200 }),
    json({ ok: false, code: "unauthorized" }),
    json({ ok: "true" }),
    json([true]),
    json(null),
    json("ok"),
  ]) {
    calls = [];
    mockFetch(redirect(REDIRECT), body);
    assert.deepEqual(await callAppsScript(WEBHOOK, PAYLOAD, 1000), { ok: false, reason: "failed" });
  }
  assert.ok(logs.includes("[wycena] Apps Script nie potwierdził zapisu: HTTP 200 (unauthorized), etap: odczyt odpowiedzi"));
});

test("H. kod błędu z odpowiedzi trafia do logu tylko w bezpiecznym formacie", async () => {
  mockFetch(json({ ok: false, code: `zob. ${WEBHOOK} ${SECRET}` }));
  await callAppsScript(WEBHOOK, PAYLOAD, 1000);
  assert.deepEqual(logs, ["[wycena] Apps Script nie potwierdził zapisu: HTTP 200, etap: POST"]);
});

/** fetch, który odpowiada po `ms` albo przerywa się razem z sygnałem. */
const slow = (ms, response) => (init) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(response), ms);
    init.signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(init.signal.reason);
    });
  });

test("I. jeden budżet czasu na POST i odczyt przekierowania", async () => {
  /* POST 120 ms + GET 120 ms przy limicie 200 ms: każde żądanie z osobna
     mieści się w limicie, razem — nie. */
  mockFetch(slow(120, redirect(REDIRECT)), slow(120, json({ ok: true })));
  const start = performance.now();
  const res = await callAppsScript(WEBHOOK, PAYLOAD, 200);
  const elapsed = performance.now() - start;

  assert.deepEqual(res, { ok: false, reason: "failed" });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.signal, calls[1].init.signal, "ten sam AbortSignal");
  assert.ok(elapsed < 235, `przerwane po ${elapsed} ms`);
  assert.deepEqual(logs, ["[wycena] Przekroczony czas odpowiedzi Apps Script, etap: odczyt odpowiedzi"]);
});

test("I. timeout już na POST", async () => {
  mockFetch(slow(500, json({ ok: true })));
  assert.deepEqual(await callAppsScript(WEBHOOK, PAYLOAD, 50), { ok: false, reason: "failed" });
  assert.equal(calls.length, 1);
  assert.deepEqual(logs, ["[wycena] Przekroczony czas odpowiedzi Apps Script, etap: POST"]);
});

test("błąd sieci to bezpieczna porażka", async () => {
  mockFetch(() => {
    throw new TypeError(`fetch failed: ${WEBHOOK}`);
  });
  assert.deepEqual(await callAppsScript(WEBHOOK, PAYLOAD, 1000), { ok: false, reason: "failed" });
  assert.deepEqual(logs, ["[wycena] Brak połączenia z Apps Script, etap: POST"]);
});

/* ------------------------------------------------------------------ *
 * Jedno ponowienie po 404 na jednorazowym adresie odpowiedzi
 * ------------------------------------------------------------------ */

const NOT_FOUND = () => new Response("<html>Not Found</html>", { status: 404, headers: { "content-type": "text/html" } });
const WITH_FILE = {
  ...PAYLOAD,
  attachments: [{ name: "plan.pdf", mimeType: "application/pdf", base64: "JVBERi0xLjQK" }],
};
/* Budżet wystarczający na ponowienie, ale krótki dla testów. */
const RETRY_TIMING = { totalMs: 2000, firstAttemptMs: 1500, minRetryMs: 200 };
const RETRY_LOG = "[wycena] Odpowiedź Apps Script wygasła (HTTP 404); ponawiam zapis z tym samym identyfikatorem zgłoszenia";
const RECOVERED_LOG = "[wycena] Zapis potwierdzony po ponowieniu";
const posts = () => calls.filter((c) => c.init.method === "POST");

test("R-A. zwykły sukces: 1 POST, 1 GET, bez ponowienia", async () => {
  mockFetch(redirect(REDIRECT), json({ ok: true, duplicate: false }));
  const res = await callAppsScript(WEBHOOK, WITH_FILE, RETRY_TIMING);
  assert.deepEqual(res, { ok: true, data: { ok: true, duplicate: false } });
  assert.equal(posts().length, 1);
  assert.equal(calls.length, 2);
  assert.deepEqual(logs, []);
});

test("R-B. awaria z produkcji: 404 → jedno ponowienie → duplicate:true", async () => {
  mockFetch(redirect(REDIRECT), NOT_FOUND(), redirect(REDIRECT), json({ ok: true, duplicate: true }));
  const res = await callAppsScript(WEBHOOK, WITH_FILE, RETRY_TIMING);
  assert.deepEqual(res, { ok: true, data: { ok: true, duplicate: true } });

  const [first, second] = posts();
  assert.equal(posts().length, 2, "dokładnie dwa POST-y");
  assert.equal(calls.length, 4);
  assert.equal(first.url, WEBHOOK);
  assert.equal(second.url, WEBHOOK);
  /* I. Te same bajty: ten sam submissionId, dane i załączniki. */
  assert.equal(second.init.body, first.init.body);
  assert.equal(JSON.parse(first.init.body).submissionId, SUBMISSION_ID);
  assert.equal(JSON.parse(second.init.body).submissionId, SUBMISSION_ID);
  assert.deepEqual(JSON.parse(second.init.body), WITH_FILE);
  /* GET-y bez sekretu i treści. */
  for (const get of calls.filter((c) => c.init.method === "GET")) {
    assert.equal(get.url, REDIRECT);
    assert.equal(get.init.body, undefined);
  }
  assert.deepEqual(logs, [RETRY_LOG, RECOVERED_LOG]);
});

test("R-C. ponowienie z bezpośrednią odpowiedzią 200 JSON", async () => {
  mockFetch(redirect(REDIRECT), NOT_FOUND(), json({ ok: true, duplicate: true }));
  const res = await callAppsScript(WEBHOOK, WITH_FILE, RETRY_TIMING);
  assert.deepEqual(res, { ok: true, data: { ok: true, duplicate: true } });
  assert.equal(posts().length, 2);
  assert.deepEqual(logs, [RETRY_LOG, RECOVERED_LOG]);
});

test("R-C. ponowienie z duplicate:false i folderUrl też jest sukcesem", async () => {
  const folderUrl = "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUv";
  mockFetch(redirect(REDIRECT), NOT_FOUND(), redirect(REDIRECT), json({ ok: true, duplicate: false, folderUrl }));
  const res = await callAppsScript(WEBHOOK, WITH_FILE, RETRY_TIMING);
  assert.deepEqual(res, { ok: true, data: { ok: true, duplicate: false, folderUrl } });
  assert.equal(posts().length, 2);
});

test("R-D. drugie 404 kończy się porażką — bez trzeciej próby", async () => {
  mockFetch(redirect(REDIRECT), NOT_FOUND(), redirect(REDIRECT), NOT_FOUND());
  const res = await callAppsScript(WEBHOOK, WITH_FILE, RETRY_TIMING);
  assert.deepEqual(res, { ok: false, reason: "failed" });
  assert.equal(posts().length, 2);
  assert.equal(calls.length, 4, "nadmiarowe wywołanie rzuciłoby w mockFetch");
  assert.deepEqual(logs, [
    RETRY_LOG,
    "[wycena] Apps Script nie potwierdził zapisu: HTTP 404, etap: ponowny odczyt odpowiedzi",
  ]);
});

test("R-D. błąd ponowienia też bez trzeciej próby", async () => {
  mockFetch(redirect(REDIRECT), NOT_FOUND(), json({ ok: false, code: "INTERNAL_ERROR" }));
  assert.deepEqual(await callAppsScript(WEBHOOK, WITH_FILE, RETRY_TIMING), { ok: false, reason: "failed" });
  assert.equal(posts().length, 2);
  assert.deepEqual(logs, [
    RETRY_LOG,
    "[wycena] Apps Script nie potwierdził zapisu: HTTP 200 (INTERNAL_ERROR), etap: ponowny POST",
  ]);
});

test("R-E. jawny ok:false nie jest ponawiany", async () => {
  mockFetch(redirect(REDIRECT), json({ ok: false, code: "UNAUTHORIZED" }));
  assert.deepEqual(await callAppsScript(WEBHOOK, WITH_FILE, RETRY_TIMING), { ok: false, reason: "failed" });
  assert.equal(posts().length, 1);

  calls = [];
  mockFetch(json({ ok: false, code: "INTERNAL_ERROR" }));
  assert.deepEqual(await callAppsScript(WEBHOOK, WITH_FILE, RETRY_TIMING), { ok: false, reason: "failed" });
  assert.equal(posts().length, 1);
  assert.ok(!logs.includes(RETRY_LOG));
});

test("R-F. 4xx/5xx inne niż 404 na odczycie nie są ponawiane", async () => {
  for (const [label, responses] of [
    ["500 na POST", [json({ ok: true }, 500)]],
    ["404 na samym POST", [NOT_FOUND()]],
    ["500 na odczycie", [redirect(REDIRECT), json({ ok: true }, 500)]],
    ["401 na odczycie", [redirect(REDIRECT), json({}, 401)]],
    ["403 na odczycie", [redirect(REDIRECT), json({}, 403)]],
    ["410 na odczycie", [redirect(REDIRECT), json({}, 410)]],
    ["302 na odczycie (zużyty adres)", [redirect(REDIRECT), redirect(WEBHOOK)]],
    ["nie-JSON po 200", [redirect(REDIRECT), new Response("<html>ok</html>", { status: 200 })]],
  ]) {
    calls = [];
    mockFetch(...responses);
    assert.deepEqual(await callAppsScript(WEBHOOK, WITH_FILE, RETRY_TIMING), { ok: false, reason: "failed" }, label);
    assert.equal(posts().length, 1, label);
    assert.ok(!logs.includes(RETRY_LOG), label);
  }
});

test("R-G. niedozwolony cel przekierowania nie jest ponawiany", async () => {
  for (const location of ["https://evil.com/", "https://script.googleusercontent.com.evil.com/", null]) {
    calls = [];
    mockFetch(redirect(location));
    assert.deepEqual(await callAppsScript(WEBHOOK, WITH_FILE, RETRY_TIMING), { ok: false, reason: "failed" });
    assert.equal(calls.length, 1);
  }
  assert.ok(!logs.includes(RETRY_LOG));
});

test("R-G. timeout pierwszej próby nie jest ponawiany", async () => {
  mockFetch(slow(500, redirect(REDIRECT)));
  const res = await callAppsScript(WEBHOOK, WITH_FILE, { totalMs: 2000, firstAttemptMs: 100, minRetryMs: 50 });
  assert.deepEqual(res, { ok: false, reason: "failed" });
  assert.equal(calls.length, 1);
  assert.deepEqual(logs, ["[wycena] Przekroczony czas odpowiedzi Apps Script, etap: POST"]);
});

test("R-H. 404, ale za mało czasu do terminu — bez drugiego POST", async () => {
  /* Termin 300 ms, minimum na ponowienie 200 ms, 404 przychodzi po ~150 ms. */
  mockFetch(redirect(REDIRECT), slow(150, NOT_FOUND()));
  const res = await callAppsScript(WEBHOOK, WITH_FILE, { totalMs: 300, firstAttemptMs: 300, minRetryMs: 200 });
  assert.deepEqual(res, { ok: false, reason: "failed" });
  assert.equal(posts().length, 1);
  assert.deepEqual(logs, [
    "[wycena] Apps Script nie potwierdził zapisu: HTTP 404, etap: odczyt odpowiedzi — za mało czasu na ponowienie",
  ]);
});

test("R-H. ponowienie dostaje tylko resztę wspólnego terminu", async () => {
  /* Pierwsza próba ~100 ms, ponowienie wisi: całość kończy się na terminie
     (400 ms), a nie po kolejnym pełnym limicie. */
  mockFetch(redirect(REDIRECT), slow(100, NOT_FOUND()), slow(5000, json({ ok: true })));
  const start = performance.now();
  const res = await callAppsScript(WEBHOOK, WITH_FILE, { totalMs: 400, firstAttemptMs: 400, minRetryMs: 50 });
  const elapsed = performance.now() - start;
  assert.deepEqual(res, { ok: false, reason: "failed" });
  assert.equal(posts().length, 2);
  assert.ok(elapsed < 480, `całość trwała ${Math.round(elapsed)} ms`);
  assert.deepEqual(logs, [RETRY_LOG, "[wycena] Przekroczony czas odpowiedzi Apps Script, etap: ponowny POST"]);
});
