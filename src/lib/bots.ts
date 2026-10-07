import { lookup, reverse } from "node:dns/promises";
import { cached, getDb } from "./db";
import { ipv4InCidr } from "./traffic";

export type BotKind = "search" | "ai-search" | "ai-training" | "ai-user" | "other";

interface BotDef {
  id: string;
  name: string;
  operator: string;
  kind: BotKind;
  ua: RegExp;
  /** How we can prove a hit really is this bot, not someone borrowing its name. */
  verify?: { rdns: RegExp } | { ranges: string };
}

/** Order matters only where patterns overlap; none of these do. */
export const BOTS: BotDef[] = [
  { id: "googlebot", name: "Googlebot", operator: "Google", kind: "search", ua: /Googlebot/i, verify: { rdns: /\.(googlebot|google)\.com$/ } },
  { id: "bingbot", name: "Bingbot", operator: "Microsoft", kind: "search", ua: /bingbot/i, verify: { rdns: /\.search\.msn\.com$/ } },
  { id: "seznambot", name: "SeznamBot", operator: "Seznam.cz", kind: "search", ua: /SeznamBot/i, verify: { rdns: /\.seznam\.cz$/ } },
  { id: "applebot", name: "Applebot", operator: "Apple", kind: "search", ua: /Applebot/i, verify: { rdns: /\.applebot\.apple\.com$/ } },
  { id: "yandexbot", name: "YandexBot", operator: "Yandex", kind: "search", ua: /YandexBot/i, verify: { rdns: /\.yandex\.(ru|net|com)$/ } },
  { id: "duckduckbot", name: "DuckDuckBot", operator: "DuckDuckGo", kind: "search", ua: /DuckDuckBot/i },
  { id: "oai-searchbot", name: "OAI-SearchBot", operator: "OpenAI", kind: "ai-search", ua: /OAI-SearchBot/i, verify: { ranges: "https://openai.com/searchbot.json" } },
  { id: "chatgpt-user", name: "ChatGPT-User", operator: "OpenAI", kind: "ai-user", ua: /ChatGPT-User/i, verify: { ranges: "https://openai.com/chatgpt-user.json" } },
  { id: "gptbot", name: "GPTBot", operator: "OpenAI", kind: "ai-training", ua: /GPTBot/i, verify: { ranges: "https://openai.com/gptbot.json" } },
  { id: "perplexitybot", name: "PerplexityBot", operator: "Perplexity", kind: "ai-search", ua: /PerplexityBot/i, verify: { ranges: "https://www.perplexity.ai/perplexitybot.json" } },
  { id: "perplexity-user", name: "Perplexity-User", operator: "Perplexity", kind: "ai-user", ua: /Perplexity-User/i, verify: { ranges: "https://www.perplexity.ai/perplexity-user.json" } },
  { id: "claude-searchbot", name: "Claude-SearchBot", operator: "Anthropic", kind: "ai-search", ua: /Claude-SearchBot/i },
  { id: "claude-user", name: "Claude-User", operator: "Anthropic", kind: "ai-user", ua: /Claude-User/i },
  { id: "claudebot", name: "ClaudeBot", operator: "Anthropic", kind: "ai-training", ua: /ClaudeBot/i },
  { id: "meta-externalagent", name: "Meta-ExternalAgent", operator: "Meta", kind: "ai-training", ua: /meta-externalagent/i },
  { id: "ccbot", name: "CCBot", operator: "Common Crawl", kind: "ai-training", ua: /CCBot/i },
  { id: "bytespider", name: "Bytespider", operator: "ByteDance", kind: "ai-training", ua: /Bytespider/i },
  { id: "amazonbot", name: "Amazonbot", operator: "Amazon", kind: "other", ua: /Amazonbot/i },
];

/** The bots an owner should expect to see; absence of these is worth saying out loud. */
export const KEY_BOTS = ["googlebot", "bingbot", "seznambot", "oai-searchbot", "gptbot", "perplexitybot", "claudebot"];

/** One regex the server snippets (PHP, Next) use to decide whether to report at all. */
export const BOT_UA_PATTERN = BOTS.map((b) => b.ua.source).join("|");

export const botOf = (ua: string) => BOTS.find((b) => b.ua.test(ua)) ?? null;

const verifiedIps = new Map<string, boolean>();

/** true / false when we can check, null when the operator publishes no way to. */
export async function verifyBot(bot: BotDef, ip: string): Promise<boolean | null> {
  if (!bot.verify || !ip) return null;
  const memo = `${bot.id}|${ip}`;
  if (verifiedIps.has(memo)) return verifiedIps.get(memo)!;
  let ok = false;
  try {
    if ("rdns" in bot.verify) {
      // Reverse lookup, then forward-confirm: a PTR record alone can be faked.
      const names = await reverse(ip);
      for (const n of names) {
        if (!bot.verify.rdns.test(n)) continue;
        const addrs = await lookup(n, { all: true });
        if (addrs.some((a) => a.address === ip)) ok = true;
      }
    } else {
      const url = bot.verify.ranges;
      const prefixes = await cached(`ranges:${url}`, 86_400_000, async () => {
        const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; CzechThisReport)" } });
        const j = (await res.json()) as { prefixes?: { ipv4Prefix?: string }[] };
        return (j.prefixes ?? []).map((p) => p.ipv4Prefix).filter(Boolean) as string[];
      });
      ok = prefixes.some((c) => ipv4InCidr(ip, c));
    }
  } catch {
    ok = false;
  }
  if (verifiedIps.size > 5000) verifiedIps.clear();
  verifiedIps.set(memo, ok);
  return ok;
}

export function recordBotHit(siteId: string, botId: string, verified: boolean | null, path: string, status: number | null) {
  getDb()
    .prepare("INSERT INTO bot_hits (site_id, ts, bot, verified, path, status) VALUES (?, ?, ?, ?, ?, ?)")
    .run(siteId, Date.now(), botId, verified === null ? null : verified ? 1 : 0, path.slice(0, 300), status);
}

export interface BotSummary {
  installed: boolean;
  bots: { id: string; hits: number; last: number | null; fake: number; errors: number }[];
  aiPages: { path: string; hits: number }[];
}

/** Last 30 days. Hits that failed verification are counted separately, not as the bot. */
export function botSummary(siteId: string): BotSummary {
  const db = getDb();
  const since = Date.now() - 30 * 86_400_000;
  const rows = db
    .prepare(
      `SELECT bot id, SUM(COALESCE(verified,1)) hits, MAX(CASE WHEN COALESCE(verified,1)=1 THEN ts END) last,
              SUM(verified = 0) fake, SUM(COALESCE(verified,1)=1 AND status >= 400) errors
       FROM bot_hits WHERE site_id = ? AND ts >= ? GROUP BY bot`
    )
    .all(siteId, since) as BotSummary["bots"];
  const aiIds = BOTS.filter((b) => b.kind.startsWith("ai")).map((b) => b.id);
  return {
    installed: !!db.prepare("SELECT 1 FROM bot_hits WHERE site_id = ? LIMIT 1").get(siteId),
    bots: rows,
    aiPages: db
      .prepare(
        `SELECT path, COUNT(*) hits FROM bot_hits WHERE site_id = ? AND ts >= ? AND COALESCE(verified,1)=1
         AND bot IN (${aiIds.map(() => "?").join(",")}) GROUP BY path ORDER BY hits DESC LIMIT 10`
      )
      .all(siteId, since, ...aiIds) as BotSummary["aiPages"],
  };
}
