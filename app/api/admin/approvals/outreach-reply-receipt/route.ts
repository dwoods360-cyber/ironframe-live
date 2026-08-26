import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { processOutreachReplyReceipt } from "@/app/lib/server/outreachReplyReceiptCore";

export const dynamic = "force-dynamic";

/**
 * Manual Ops path — register a prospect reply → light receipt + founder alert.
 * POST { fromEmail, subject?, companyHint?, firstNameHint?, messageId? }
 */
export async function POST(request: Request) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const fromEmail = String(body.fromEmail ?? body.email ?? "").trim();
  if (!fromEmail.includes("@")) {
    return NextResponse.json({ error: "fromEmail is required." }, { status: 400 });
  }

  try {
    const result = await processOutreachReplyReceipt({
      fromEmail,
      subject: body.subject != null ? String(body.subject) : null,
      messageId: body.messageId != null ? String(body.messageId) : null,
      companyHint: body.companyHint != null ? String(body.companyHint) : null,
      firstNameHint: body.firstNameHint != null ? String(body.firstNameHint) : null,
      source: "manual",
    });
    return NextResponse.json({ ok: result.ok, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[outreach-reply-receipt]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
