import { NextResponse } from "next/server";

import { processOutreachReplyReceipt } from "@/app/lib/server/outreachReplyReceiptCore";
import { isSalesInboundMailbox } from "@/lib/gtm/salesFromAddress";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Dual auto intake:
 * 1) Resend `email.received` webhook (when receiving domain / forward is configured)
 * 2) Zoho → Make/Zapier → same URL with Bearer + { from, subject, messageId }
 *
 * Auth: Authorization: Bearer ${RESEND_INBOUND_WEBHOOK_SECRET}
 *   or  x-ironframe-inbound-secret: ${RESEND_INBOUND_WEBHOOK_SECRET}
 *
 * Customer-facing receipt From stays dereck@ironframegrc.com (never Gmail).
 */
function checkInboundSecret(request: Request): boolean {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("x-ironframe-inbound-secret")?.trim();
  if (header && header === secret) return true;
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ") && auth.slice(7).trim() === secret) return true;
  return false;
}

function collectAddresses(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((v) => collectAddresses(v));
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export async function POST(request: Request) {
  if (!checkInboundSecret(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  // Resend envelope: { type: "email.received", data: { from, to, subject, message_id, email_id } }
  const isResend = body.type === "email.received" && body.data && typeof body.data === "object";
  const data = (isResend ? body.data : body) as Record<string, unknown>;

  const fromRaw = String(data.from ?? data.fromEmail ?? data.email ?? "").trim();
  if (!fromRaw.includes("@")) {
    return NextResponse.json({ ok: true, ignored: true, reason: "no_from" });
  }

  const toList = [
    ...collectAddresses(data.to),
    ...collectAddresses(data.received_for),
    ...collectAddresses(data.toEmail),
  ];

  // When Resend/Zoho includes To, require sales mailbox. Manual-shaped payloads may omit To.
  if (toList.length > 0) {
    const hitsSales = toList.some((addr) => {
      try {
        return isSalesInboundMailbox(addr.replace(/^.*</, "").replace(/>.*$/, "").trim());
      } catch {
        return false;
      }
    });
    if (!hitsSales) {
      return NextResponse.json({ ok: true, ignored: true, reason: "not_sales_mailbox" });
    }
  }

  const source = isResend ? "resend" : "zoho_forward";
  const messageId = String(
    data.message_id ?? data.messageId ?? data.email_id ?? data.emailId ?? "",
  ).trim();

  try {
    const result = await processOutreachReplyReceipt({
      fromEmail: fromRaw,
      subject: data.subject != null ? String(data.subject) : null,
      messageId: messageId || null,
      companyHint: data.company != null ? String(data.company) : null,
      firstNameHint: data.firstName != null ? String(data.firstName) : null,
      source,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resend-inbound]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
