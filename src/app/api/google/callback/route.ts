import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { connectGoogle, listProperties, pickProperty } from "@/lib/google";
import { getDb } from "@/lib/db";
import { getSite } from "@/lib/sites";
import { SITE_URL } from "@/lib/site";

export async function GET(req: NextRequest) {
  const [state, locale = "en", siteId = ""] = (req.cookies.get("ctr_gstate")?.value ?? "").split("|");
  const back = (q: string) => {
    const path = siteId ? `/${locale}/dashboard/${siteId}/setup` : `/${locale}/dashboard`;
    const res = NextResponse.redirect(`${SITE_URL}${path}?google=${q}`);
    res.cookies.delete({ name: "ctr_gstate", path: "/api/google" });
    return res;
  };
  const user = await getUser();
  const code = req.nextUrl.searchParams.get("code");
  if (!user || !state || state !== req.nextUrl.searchParams.get("state") || !code) return back("error");

  try {
    await connectGoogle(user.id, code);
    // Link every one of the owner's sites that has a matching property.
    const props = await listProperties(user.id);
    const sites = getDb().prepare("SELECT id FROM sites WHERE user_id = ?").all(user.id) as { id: string }[];
    for (const { id } of sites) {
      const site = getSite(user.id, id);
      if (!site || site.gsc_property) continue;
      const prop = pickProperty(props, site.host);
      if (prop) getDb().prepare("UPDATE sites SET gsc_property = ? WHERE id = ?").run(prop, id);
    }
  } catch (e) {
    console.error("Google connect failed", e);
    return back("error");
  }
  return back("ok");
}
