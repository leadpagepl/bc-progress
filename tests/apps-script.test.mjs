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

test("G. końcowe 404 to bezpieczna porażka", async () => {
  mockFetch(redirect(REDIRECT), new Response("<html>Not Found</html>", { status: 404 }));
  const res = await callAppsScript(WEBHOOK, PAYLOAD, 1000);
  assert.deepEqual(res, { ok: false, reason: "failed" });
  assert.deepEqual(logs, ["[wycena] Apps Script nie potwierdził zapisu: HTTP 404, etap: odczyt odpowiedzi"]);
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
  assert.deepEqual(logs, ["[wycena] Przekroczony czas odpowiedzi Apps Script"]);
});

test("I. timeout już na POST", async () => {
  mockFetch(slow(500, json({ ok: true })));
  assert.deepEqual(await callAppsScript(WEBHOOK, PAYLOAD, 50), { ok: false, reason: "failed" });
  assert.equal(calls.length, 1);
  assert.deepEqual(logs, ["[wycena] Przekroczony czas odpowiedzi Apps Script"]);
});

test("błąd sieci to bezpieczna porażka", async () => {
  mockFetch(() => {
    throw new TypeError(`fetch failed: ${WEBHOOK}`);
  });
  assert.deepEqual(await callAppsScript(WEBHOOK, PAYLOAD, 1000), { ok: false, reason: "failed" });
  assert.deepEqual(logs, ["[wycena] Brak połączenia z Apps Script"]);
});
