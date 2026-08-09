/**
 * Verifies the memory guards hold, by auditing deliberately hostile local pages.
 *
 *   npm run build && npm start      (in another terminal)
 *   node scripts/check-memory-caps.mjs
 *
 * Fails if the HTML byte cap, the axe element cap, the jsdom cleanup or the
 * concurrency cap regress. Stays under the 10-per-window per-IP rate limit.
 */
import { createServer } from "node:http";
import assert from "node:assert/strict";

const APP = process.env.APP_URL ?? "http://localhost:3000";
const PORT = 45_678;

// ~4 MB and ~180k elements: past both the byte cap and the axe element cap.
const filler = `<div class="row"><span>cell</span><a href="/x">link</a></div>\n`.repeat(60_000);
const page = `<!doctype html><html lang="en"><head><title>Obese</title></head><body><img src="x.png">${filler}</body></html>`;

const server = createServer((req, res) => {
  if (req.url === "/robots.txt") return res.end("User-agent: *\nSitemap: /sitemap.xml\n");
  // a sitemap far too big to buffer — only its opening tag should ever be read
  if (req.url === "/sitemap.xml") return res.end(`<urlset>${"<url><loc>/a</loc></url>".repeat(200_000)}</urlset>`);
  if (req.url === "/llms.txt") { res.statusCode = 404; return res.end(); }
  res.setHeader("content-type", "text/html");
  res.end(page);
});

const mem = async () => (await (await fetch(`${APP}/api/health`)).json()).memoryMb;
const audit = (url) =>
  fetch(`${APP}/api/audit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });

await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
// public DNS name that resolves to 127.0.0.1 — assertPublicHost rejects a literal
// loopback address, so this is how the local test server gets audited
const target = `http://localtest.me:${PORT}/`;

try {
  const before = await mem();
  console.log(`heap limit ${before.heapLimit} MB · rss before ${before.rss} MB`);
  if (before.heapLimit > 1024) {
    console.warn("WARNING: heap limit is unbounded — set NODE_OPTIONS=--max-old-space-size=512");
  }

  // 1. an oversized, element-dense page still produces a readable report
  const res = await audit(target);
  const body = await res.json();
  assert.equal(res.status, 200, `audit failed: ${res.status} ${JSON.stringify(body)}`);
  const html = await (await fetch(`${APP}/en/report/${body.id}`)).text();
  assert.match(html, /Obese|localtest\.me/, "report page did not render the audited site");

  // 2. three at once: the third is refused rather than tripling peak memory
  const burst = await Promise.all([audit(target), audit(target), audit(target)]);
  assert.ok(
    burst.some((r) => r.status === 429),
    "concurrency cap did not refuse the third simultaneous audit"
  );

  // 3. RSS must plateau, not ratchet. GC timing makes any single reading noisy,
  //    so compare the peak of the first half against the peak of the second.
  const rss = [];
  for (let i = 0; i < 4; i++) {
    await audit(target);
    rss.push((await mem()).rss);
  }
  const early = Math.max(rss[0], rss[1]);
  const late = Math.max(rss[2], rss[3]);
  console.log(`rss samples: ${rss.join(", ")} MB`);
  assert.ok(late <= early * 1.35, `RSS ratcheting: ${early} MB → ${late} MB across audits`);

  console.log("OK — memory caps hold");
} finally {
  server.close();
}
