import { timingSafeEqual } from "node:crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { botOf, recordBotHit, verifyBot } from "@/lib/bots";
import { getDb } from "@/lib/db";

/** Server-to-server: the owner's PHP / Next snippet reports crawler requests here. */
export async function POST(req: NextRequest) {
  const text = await req.text();
  if (text.length > 4000) return new NextResponse(null, { status: 413 });
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
  const site = getDb().prepare("SELECT id, bot_key FROM sites WHERE id = ?").get(str(d.s, 40)) as
    | { id: string; bot_key: string | null }
    | undefined;
  const key = Buffer.from(str(d.k, 100));
  // The key is a secret (unlike the site id), so a stranger can't fill the log.
  if (!site?.bot_key || key.length !== site.bot_key.length || !timingSafeEqual(key, Buffer.from(site.bot_key))) {
    return new NextResponse(null, { status: 403 });
  }
  const bot = botOf(str(d.ua, 500));
  if (!bot) return new NextResponse(null, { status: 204 });
  const ip = str(d.ip, 64);
  const path = str(d.path, 300) || "/";
  const status = Number(d.status);
  // DNS checks can take a second; answer the snippet first.
  after(async () => {
    recordBotHit(site.id, bot.id, await verifyBot(bot, ip), path, Number.isFinite(status) && status > 0 ? status : null);
  });
  return new NextResponse(null, { status: 204 });
}
