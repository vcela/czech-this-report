import { getDb } from "./db";
import { dayOf } from "./analytics";

/**
 * Credits: a fixed, predictable price per AI action, so the owner knows the
 * cost before pressing a button. The real token and web-search usage behind
 * every charge is recorded too and shown next to it — measured, not guessed.
 */
export const PRICES = {
  /** one question asked to ChatGPT with web search */
  geo: 2,
  /** suggesting questions for the citation check */
  prompts: 1,
  /** topic ideas */
  topics: 2,
  /** competitor discovery with web search */
  competitors: 3,
} as const;
export type CreditKind = keyof typeof PRICES;

/** Monthly allowance per account; resets on the 1st (Europe/Prague). */
export const monthlyAllowance = () => Math.max(0, Number(process.env.AI_MONTHLY_CREDITS) || 300);

const monthOf = (ms: number) => dayOf(ms).slice(0, 7);

export class NotEnoughCredits extends Error {}

export interface Meter {
  userId: number;
  siteId: string;
  kind: CreditKind;
}

export function recordUsage(m: Meter, usage: { input: number; output: number; searches: number }): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO ai_usage (user_id, site_id, ts, day, month, kind, credits, input_tokens, output_tokens, searches)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(m.userId, m.siteId, now, dayOf(now), monthOf(now), m.kind, PRICES[m.kind], usage.input, usage.output, usage.searches);
}

export function usedThisMonth(userId: number): number {
  const r = getDb()
    .prepare("SELECT COALESCE(SUM(credits), 0) n FROM ai_usage WHERE user_id = ? AND month = ?")
    .get(userId, monthOf(Date.now())) as { n: number };
  return r.n;
}

export const remainingCredits = (userId: number) => Math.max(0, monthlyAllowance() - usedThisMonth(userId));

export function assertCredits(userId: number, cost: number): void {
  if (remainingCredits(userId) < cost) throw new NotEnoughCredits();
}

/** First day of next month, local time — when the allowance refills. */
export function resetDate(): Date {
  const [y, m] = monthOf(Date.now()).split("-").map(Number);
  return new Date(y, m, 1);
}

export interface CreditOverview {
  allowance: number;
  used: number;
  remaining: number;
  reset: Date;
  daysToReset: number;
  tokens: { input: number; output: number; searches: number };
  /** credits per day of the current month, 1..today */
  daily: { day: string; credits: number }[];
  /** last 6 months, oldest first */
  months: { month: string; credits: number }[];
  byKind: { kind: CreditKind; credits: number; count: number }[];
  recent: { ts: number; kind: CreditKind; credits: number; host: string | null; input: number; output: number; searches: number }[];
}

export function creditOverview(userId: number): CreditOverview {
  const db = getDb();
  const now = Date.now();
  const month = monthOf(now);
  const used = usedThisMonth(userId);
  const tok = db
    .prepare(
      `SELECT COALESCE(SUM(input_tokens),0) input, COALESCE(SUM(output_tokens),0) output, COALESCE(SUM(searches),0) searches
       FROM ai_usage WHERE user_id = ? AND month = ?`
    )
    .get(userId, month) as CreditOverview["tokens"];
  const perDay = new Map(
    (db.prepare("SELECT day, SUM(credits) c FROM ai_usage WHERE user_id = ? AND month = ? GROUP BY day").all(userId, month) as {
      day: string;
      c: number;
    }[]).map((r) => [r.day, r.c])
  );
  const today = Number(dayOf(now).slice(8, 10));
  const daily = Array.from({ length: today }, (_, i) => {
    const day = `${month}-${String(i + 1).padStart(2, "0")}`;
    return { day, credits: perDay.get(day) ?? 0 };
  });
  const [y, m] = month.split("-").map(Number);
  const monthList = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, m - 1 - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const perMonth = new Map(
    (db.prepare("SELECT month, SUM(credits) c FROM ai_usage WHERE user_id = ? AND month >= ? GROUP BY month").all(userId, monthList[0]) as {
      month: string;
      c: number;
    }[]).map((r) => [r.month, r.c])
  );
  return {
    allowance: monthlyAllowance(),
    used,
    remaining: Math.max(0, monthlyAllowance() - used),
    reset: resetDate(),
    daysToReset: Math.max(0, Math.ceil((resetDate().getTime() - now) / 86_400_000)),
    tokens: tok,
    daily,
    months: monthList.map((mo) => ({ month: mo, credits: perMonth.get(mo) ?? 0 })),
    byKind: db
      .prepare(
        "SELECT kind, SUM(credits) credits, COUNT(*) count FROM ai_usage WHERE user_id = ? AND month = ? GROUP BY kind ORDER BY credits DESC"
      )
      .all(userId, month) as CreditOverview["byKind"],
    recent: db
      .prepare(
        `SELECT u.ts, u.kind, u.credits, s.host, u.input_tokens input, u.output_tokens output, u.searches
         FROM ai_usage u LEFT JOIN sites s ON s.id = u.site_id WHERE u.user_id = ? ORDER BY u.ts DESC LIMIT 15`
      )
      .all(userId) as CreditOverview["recent"],
  };
}

export interface ScheduledCharge {
  siteId: string;
  host: string;
  next: number;
  credits: number;
  /** runs left before the allowance resets */
  runsThisMonth: number;
}

/** Weekly ChatGPT citation checks still to come this month, and what they will cost. */
export function scheduledCharges(userId: number): ScheduledCharge[] {
  const rows = getDb()
    .prepare(
      `SELECT s.id, s.host, s.geo_prompts, (SELECT MAX(run_at) FROM geo_results g WHERE g.site_id = s.id) last
       FROM sites s WHERE s.user_id = ? AND s.geo_prompts != ''`
    )
    .all(userId) as { id: string; host: string; geo_prompts: string; last: number | null }[];
  const reset = resetDate().getTime();
  const week = 7 * 86_400_000;
  return rows
    .map((r) => {
      const prompts = r.geo_prompts.split("\n").filter((x) => x.trim()).slice(0, 10).length;
      const next = Math.max(Date.now(), (r.last ?? 0) + week);
      const runsThisMonth = next < reset ? Math.floor((reset - next) / week) + 1 : 0;
      return { siteId: r.id, host: r.host, next, credits: prompts * PRICES.geo, runsThisMonth };
    })
    .sort((a, b) => a.next - b.next);
}
