# Czech Th!s Report

Free website audit tool: **AI search visibility (GEO/AEO) · SEO · Accessibility (WCAG 2.2)**.

Enter any URL and get a prioritized, plain-language report: what's wrong, why it costs you
customers, how to fix it, and which profession to hire for each finding. Reports are saved
under a unique shareable link. English by default, full Czech localization.

Built by [Ondřej Huk](https://czech-this.com) at **Czech Th!s**.

## Stack

- **Next.js 16** (App Router, Turbopack), React 19, Tailwind CSS 4, TypeScript
- **SQLite** (better-sqlite3) — reports & contact leads, zero external services
- **cheerio** — HTML parsing; **axe-core + jsdom** — automated WCAG testing
- **Google PageSpeed Insights** — real Core Web Vitals (optional, honest fallback without it)

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm start
```

## Configuration (`.env`, all optional)

Copy `.env.example` to `.env`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public URL — canonicals, sitemap, OG tags |
| `NEXT_PUBLIC_STRIPE_DONATE_URL` | Stripe Payment Link for donations; buttons hidden when empty |
| `PSI_API_KEY` | PageSpeed Insights key — raises quota for Core Web Vitals measurement |
| `DATA_DIR` | SQLite location (defaults to `./data`) |

**Note:** the server needs a persistent disk for SQLite (`DATA_DIR`). On serverless-only
hosting, swap `src/lib/db.ts` for a hosted database (Turso/Postgres) — it's the only file
that touches storage.

## Architecture

```
src/lib/audit/
  fetcher.ts     fetches page, robots.txt, sitemap, llms.txt (+ SSRF guard)
  catalog.ts     every check: bilingual copy, impact/effort, role, WCAG mapping
  checks/        seo.ts · ai.ts · a11y.ts (axe-core in jsdom + static checks)
  psi.ts         PageSpeed Insights with honest "basic measurements" fallback
  score.ts       priority = impact×3 + (3−effort); pillar score = 100 − penalties
  run.ts         orchestrator (all fetches + PSI run in parallel)
src/lib/db.ts    SQLite: reports (unique 10-char ids), leads
src/app/api/     audit + contact endpoints (rate-limited, honeypot)
src/app/[locale] en/cs routes: home, report/[id], methodology, guides, about
src/proxy.ts     locale redirect (Accept-Language aware)
```

Key design rules (from `plan.md`):

- **Prioritization over length** — a single cross-pillar findings list; "Fix these first" caps at 5 items.
- **Measured vs. estimated** — every metric labelled; no fabricated numbers (no fake AI-mention score, no invented performance score when PSI is down).
- **Accessibility honesty** — automated checks cover ~30–50 % of WCAG; the report ships a manual checklist and calls its conformance line an estimate.
- **Every finding names a responsible role** — developer, hosting/DevOps, designer, copywriter, SEO specialist.
