import { NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import {
  fetchTextbeltQuota,
  resolveSmsProvider,
} from "@/app/lib/server/sendOutboundSms";

export const dynamic = "force-dynamic";

/** Operator SMS provider health — no secrets, no send. */
export async function GET() {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const provider = resolveSmsProvider();
  const hasTextbeltKey = Boolean(process.env.TEXTBELT_API_KEY?.trim());
  const smsProviderEnv = process.env.SMS_PROVIDER?.trim() || null;

  if (provider === "textbelt" || (hasTextbeltKey && provider !== "twilio")) {
    const quota = await fetchTextbeltQuota();
    return NextResponse.json({
      ok: quota.ok && (quota.quotaRemaining ?? 0) > 0,
      provider: "textbelt",
      smsProviderEnv,
      hasTextbeltKey: true,
      quotaRemaining: quota.quotaRemaining ?? null,
      error: quota.ok
        ? (quota.quotaRemaining ?? 0) < 1
          ? "Textbelt quotaRemaining < 1 — top up at https://textbelt.com/"
          : null
        : quota.error ?? "Textbelt quota check failed",
    });
  }

  if (provider === "twilio") {
    return NextResponse.json({
      ok: false,
      provider: "twilio",
      smsProviderEnv,
      hasTextbeltKey,
      error:
        "Twilio selected but Ironframe sales SMS default is Textbelt. Set SMS_PROVIDER=textbelt and TEXTBELT_API_KEY in Vercel Production.",
    });
  }

  return NextResponse.json({
    ok: false,
    provider: null,
    smsProviderEnv,
    hasTextbeltKey: false,
    error:
      "No SMS provider configured in this environment. Add SMS_PROVIDER=textbelt and TEXTBELT_API_KEY to Vercel Production, then redeploy.",
  });
}
