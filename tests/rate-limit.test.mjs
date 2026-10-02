/* Testy lokalnego limitera i normalizacji adresu klienta. Uruchomienie: npm test */
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  clientIp,
  createRateLimiter,
  parseIp,
  rateLimitKey,
} from "../app/api/wycena/rate-limit.ts";

const MIN = 60 * 1000;
const req = (headers = {}) => new Request("https://example.test/api/wycena", { method: "POST", headers });
const from = (ip) => req({ "x-real-ip": ip });

const realConsole = { error: console.error, warn: console.warn, info: console.info, log: console.log };
let logs;

beforeEach(() => {
  logs = [];
  for (const level of Object.keys(realConsole)) {
    console[level] = (...args) => logs.push(args.join(" "));
  }
});

afterEach(() => {
  Object.assign(console, realConsole);
  /* Limiter niczego nie loguje — więc żaden adres nie trafia do logów. */
  assert.deepEqual(logs, []);
});

test("poprawny IPv4", () => {
  assert.equal(parseIp("203.0.113.7"), "203.0.113.7");
  assert.equal(parseIp(" 203.0.113.7 "), "203.0.113.7");
  assert.equal(rateLimitKey("203.0.113.7"), "203.0.113.7");
});

test("poprawny IPv6", () => {
  assert.equal(parseIp("2001:DB8:1:2:3:4:5:6"), "2001:db8:1:2:3:4:5:6");
  assert.equal(parseIp("2001:db8::1"), "2001:db8::1");
  assert.equal(parseIp("::1"), "::1");
});

test("IPv4 zapisany jako IPv6 wraca jako IPv4", () => {
  assert.equal(parseIp("::ffff:203.0.113.7"), "203.0.113.7");
  assert.equal(parseIp("::FFFF:cb00:7107"), "203.0.113.7");
  assert.equal(parseIp("0:0:0:0:0:ffff:203.0.113.7"), "203.0.113.7");
  assert.equal(rateLimitKey(parseIp("::ffff:203.0.113.7")), rateLimitKey("203.0.113.7"));
});

test("ten sam /64 → ten sam kubełek, inny /64 → inny", () => {
  const a = rateLimitKey(parseIp("2001:db8:aa:bb:1111:2222:3333:4444"));
  const b = rateLimitKey(parseIp("2001:db8:aa:bb::1"));
  const c = rateLimitKey(parseIp("2001:db8:aa:bc::1"));
  assert.equal(a, "2001:db8:aa:bb::/64");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(rateLimitKey(parseIp("::1")), "0:0:0:0::/64");
  /* Klucz nie zawiera części hosta. */
  assert.ok(!a.includes("1111") && !a.includes("4444"));
});

test("błędne wartości są odrzucane", () => {
  for (const bad of [
    "",
    " ",
    null,
    undefined,
    "unknown",
    "abc",
    "1.2.3",
    "1.2.3.4.5",
    "256.1.1.1",
    "01.2.3.4",
    "1.2.3.4:443",
    "[2001:db8::1]",
    "[2001:db8::1]:443",
    "2001:db8::1%eth0",
    "fe80::1%25eth0",
    "2001:db8:::1",
    "gggg::1",
    "1.2.3.4, 5.6.7.8",
    "1.2.3.4,5.6.7.8",
    "1.2.3.4 5.6.7.8",
    "1.2.3.4\n5.6.7.8",
    "<script>alert(1)</script>",
    "1.2.3.4'; DROP TABLE x;--",
    "::ffff:999.1.1.1",
    "a".repeat(5000),
  ]) {
    assert.equal(parseIp(bad), null, JSON.stringify(bad));
  }
});

test("clientIp: x-real-ip przed x-forwarded-for, lista po przecinku pomijana", () => {
  assert.equal(clientIp(req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" })), "203.0.113.7");
  assert.equal(clientIp(req({ "x-forwarded-for": "198.51.100.1" })), "198.51.100.1");
  assert.equal(clientIp(req({ "x-real-ip": "not-an-ip", "x-forwarded-for": "198.51.100.1" })), "198.51.100.1");
  assert.equal(clientIp(req({ "x-forwarded-for": "6.6.6.6, 198.51.100.1" })), null);
  assert.equal(clientIp(req({ "x-real-ip": "", "x-forwarded-for": "" })), null);
  assert.equal(clientIp(req()), null);
});

test("limit: 5 w oknie, szóste odrzucone, inne adresy niezależne", () => {
  const rl = createRateLimiter();
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(rl.limited(from("203.0.113.7"), t0 + i), false);
  assert.equal(rl.limited(from("203.0.113.7"), t0 + 10), true);
  assert.equal(rl.limited(from("203.0.113.8"), t0 + 10), false);
  /* Ten sam klient przez adres mapowany na IPv6 nie dostaje nowego kubełka. */
  assert.equal(rl.limited(from("::ffff:203.0.113.7"), t0 + 11), true);
});

test("limit: rotacja adresów w jednym /64 nie omija limitu", () => {
  const rl = createRateLimiter();
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) assert.equal(rl.limited(from(`2001:db8:1:2::${i + 1}`), t0), false);
  assert.equal(rl.limited(from("2001:db8:1:2:ffff:ffff:ffff:ffff"), t0), true);
  assert.equal(rl.limited(from("2001:db8:1:3::1"), t0), false);
  assert.equal(rl.size(), 2);
});

test("limit: nieznany adres ma jeden wspólny kubełek", () => {
  const rl = createRateLimiter();
  const t0 = 1_000_000;
  const unknown = [req(), from("not-an-ip"), req({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }), from(""), req()];
  for (const r of unknown) assert.equal(rl.limited(r, t0), false);
  assert.equal(rl.limited(req(), t0), true);
  assert.equal(rl.size(), 1);
});

test("limit: okno się przesuwa, a odrzucone żądania nie przedłużają blokady", () => {
  const rl = createRateLimiter();
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) rl.limited(from("203.0.113.7"), t0);
  /* Uporczywe próby w czasie blokady. */
  for (let m = 1; m <= 9; m++) assert.equal(rl.limited(from("203.0.113.7"), t0 + m * MIN), true);
  assert.equal(rl.limited(from("203.0.113.7"), t0 + 10 * MIN), false);
});

test("sprzątanie: wygasłe wpisy znikają z mapy", () => {
  const rl = createRateLimiter();
  const t0 = 1_000_000;
  for (let i = 0; i < 200; i++) rl.limited(from(`198.51.${i >> 8}.${i & 255}`), t0);
  assert.equal(rl.size(), 200);
  /* Przed końcem okna nic nie znika. */
  rl.limited(from("203.0.113.7"), t0 + 5 * MIN);
  assert.equal(rl.size(), 201);
  /* Po oknie pierwsze żądanie sprząta wszystkie stare adresy. */
  rl.limited(from("203.0.113.9"), t0 + 10 * MIN);
  assert.equal(rl.size(), 2);
  rl.limited(from("203.0.113.9"), t0 + 16 * MIN);
  assert.equal(rl.size(), 1);
});

test("sprzątanie: mapa ma twardy sufit przy zalewie z wielu adresów", () => {
  const rl = createRateLimiter();
  const t0 = 1_000_000;
  for (let i = 0; i < 12_000; i++) {
    rl.limited(from(`10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`), t0);
  }
  assert.ok(rl.size() <= 10_000, `rozmiar mapy: ${rl.size()}`);
});
