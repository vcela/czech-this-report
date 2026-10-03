/** Run with: npm run test:traffic */
import assert from "node:assert/strict";
import test from "node:test";
import { classify, ipv4InCidr } from "./traffic";

const SITE = "example.cz";
const kind = (url: string, ref: string) => classify(url, ref, SITE).kind;
const label = (url: string, ref: string) => classify(url, ref, SITE).label;

test("search engines, AI assistants and social networks", () => {
  assert.equal(label("https://example.cz/", "https://www.google.cz/"), "Google");
  assert.equal(kind("https://example.cz/", "https://search.seznam.cz/?q=x"), "search");
  assert.equal(label("https://example.cz/", "https://gemini.google.com/app"), "Gemini");
  assert.equal(kind("https://example.cz/", "https://gemini.google.com/app"), "ai");
  assert.equal(label("https://example.cz/?utm_source=chatgpt.com", ""), "ChatGPT");
  assert.equal(label("https://example.cz/", "https://l.facebook.com/"), "Facebook");
});

test("paid and e-mail traffic is decided by the URL, not the referrer", () => {
  assert.equal(kind("https://example.cz/?gclid=abc", "https://www.google.com/"), "ads");
  assert.equal(label("https://example.cz/?utm_source=facebook&utm_medium=cpc", "https://facebook.com/"), "facebook");
  assert.equal(kind("https://example.cz/?utm_medium=newsletter&utm_source=ecomail", ""), "email");
  // fbclid is on every outbound Facebook link, paid or not
  assert.equal(kind("https://example.cz/?fbclid=1", "https://facebook.com/"), "social");
});

test("internal navigation, direct visits, unknown referrers", () => {
  assert.equal(kind("https://example.cz/b", "https://www.example.cz/a"), "internal");
  assert.equal(kind("https://example.cz/b", "https://shop.example.cz/a"), "internal");
  assert.equal(kind("https://example.cz/", ""), "direct");
  assert.equal(label("https://example.cz/", "https://www.firmy.cz/detail"), "firmy.cz");
  assert.equal(kind("https://example.cz/", "not a url"), "direct");
});

test("on-site search query and clean path", () => {
  const c = classify("https://example.cz/hledani?q=%20Údržba%20Webu&utm_campaign=podzim", "", SITE);
  assert.equal(c.query, "údržba webu");
  assert.equal(c.path, "/hledani");
  assert.equal(c.campaign, "podzim");
});

test("crawler IP ranges", () => {
  assert.equal(ipv4InCidr("132.196.86.17", "132.196.86.0/24"), true);
  assert.equal(ipv4InCidr("132.196.87.1", "132.196.86.0/24"), false);
  assert.equal(ipv4InCidr("104.210.140.140", "104.210.140.128/28"), true);
  assert.equal(ipv4InCidr("104.210.140.144", "104.210.140.128/28"), false);
  assert.equal(ipv4InCidr("44.208.221.197", "44.208.221.197/32"), true);
  assert.equal(ipv4InCidr("2001:db8::1", "44.208.221.197/32"), false);
});
