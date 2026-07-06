import { Resend } from "resend";
import { CREATOR, SITE_URL } from "./site";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Must be an address on a domain verified in Resend, or their sandbox
// address (onboarding@resend.dev) while testing without a custom domain.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Czech Th!s Report <onboarding@resend.dev>";
const TO_EMAIL = process.env.CONTACT_TO_EMAIL || CREATOR.email;

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!client) client = new Resend(RESEND_API_KEY);
  return client;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ContactLeadEmail {
  name: string;
  email: string;
  message: string;
  reportId?: string;
}

/**
 * Sends the contact-form enquiry to CREATOR via Resend.
 * Returns false (without throwing) if RESEND_API_KEY isn't configured or
 * the send fails — the caller still has the lead saved in SQLite either way.
 */
export async function sendContactLeadEmail(lead: ContactLeadEmail): Promise<boolean> {
  const resend = getClient();
  if (!resend) {
    console.warn("RESEND_API_KEY is not set — skipping contact e-mail (lead is still saved to the database).");
    return false;
  }

  const reportLink = lead.reportId ? `${SITE_URL}/en/report/${lead.reportId}` : null;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: lead.email,
      subject: `New enquiry from ${lead.name} — Czech Th!s Report`,
      html: `
        <p><strong>Name:</strong> ${escapeHtml(lead.name)}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(lead.email)}</p>
        ${reportLink ? `<p><strong>Report:</strong> <a href="${reportLink}">${reportLink}</a></p>` : ""}
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(lead.message).replace(/\n/g, "<br>")}</p>
      `,
      text: [
        `Name: ${lead.name}`,
        `E-mail: ${lead.email}`,
        reportLink ? `Report: ${reportLink}` : null,
        "",
        "Message:",
        lead.message,
      ]
        .filter((l) => l !== null)
        .join("\n"),
    });
    if (error) {
      console.error("Resend failed to send contact e-mail", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Resend threw while sending contact e-mail", err);
    return false;
  }
}
