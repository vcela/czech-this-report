import { NextRequest, NextResponse } from "next/server";
import { saveLead } from "@/lib/db";

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; message?: string; reportId?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  // honeypot field — bots fill it, humans never see it
  if (body.website) {
    return NextResponse.json({ ok: true });
  }
  const name = (body.name ?? "").trim().slice(0, 200);
  const email = (body.email ?? "").trim().slice(0, 200);
  const message = (body.message ?? "").trim().slice(0, 5000);
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  saveLead({
    reportId: typeof body.reportId === "string" ? body.reportId.slice(0, 20) : undefined,
    name,
    email,
    message,
  });
  return NextResponse.json({ ok: true });
}
