import { NextRequest, NextResponse } from "next/server";
import { saveLead } from "@/lib/db";
import { sendContactLeadEmail } from "@/lib/mail";

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

  const reportId = typeof body.reportId === "string" ? body.reportId.slice(0, 20) : undefined;

  try {
    saveLead({ reportId, name, email, message });
  } catch (error) {
    console.error("Failed to save contact lead", error);
    return NextResponse.json({ error: "storage_error" }, { status: 500 });
  }

  // The lead is safely stored above regardless of e-mail outcome, so a
  // Resend failure (missing key, API error) must not fail the request.
  await sendContactLeadEmail({ name, email, message, reportId });

  return NextResponse.json({ ok: true });
}
