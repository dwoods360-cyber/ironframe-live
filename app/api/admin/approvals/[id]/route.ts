import { NextResponse } from "next/server";

import {
  DISPATCHED_DRAFT_TAG,
  DISPATCHED_SALES_DRAFT_TAG,
  inferDraftKind,
  isPendingDraftSummary,
  isSalesSmsDraft,
  parsePendingDraftSummary,
  type ApprovalDispatchChannel,
} from "@/app/lib/server/approvalQueueCore";
import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { validateIngressContext } from "@/app/middleware/irongateShield";
import { sendOutboundEmail } from "@/app/lib/server/sendOutboundEmail";
import {
  normalizeE164Phone,
  sendOutboundSms,
} from "@/app/lib/server/sendOutboundSms";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Never put HITL / cadence operator notes on the wire. */
function stripOperatorOnlyOutboundLines(text: string): string {
  return text
    .replace(/\n*\[Cadence:[^\]]*\]\s*/gi, "\n")
    .replace(/\s*\(pending operator approval before send\)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeEmail(raw: unknown): string | null {
  const email = String(raw ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 320);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

type DispatchBody = {
  action?: string;
  adjustedText?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  dispatchChannel?: ApprovalDispatchChannel;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  try {
    const { id: interactionId } = await params;
    const body = (await req.json()) as DispatchBody;
    const { action, adjustedText } = body;

    if (!action || !["DISPATCH", "PURGE"].includes(action)) {
      return NextResponse.json({ error: "Invalid action perimeter request." }, { status: 400 });
    }

    const pendingInteraction = await prisma.ironboardCrmInteraction.findUnique({
      where: { id: interactionId },
      include: {
        contact: true,
      },
    });

    if (!pendingInteraction) {
      return NextResponse.json(
        { error: "Target draft record not found in system space." },
        { status: 404 },
      );
    }

    validateIngressContext(pendingInteraction.tenantId);

    if (!isPendingDraftSummary(pendingInteraction.summary)) {
      return NextResponse.json(
        { error: "Target interaction is not in a pending draft approval state." },
        { status: 409 },
      );
    }

    const draftKind = inferDraftKind(pendingInteraction.summary);
    const contact = pendingInteraction.contact;
    const inferredSms = isSalesSmsDraft(pendingInteraction.summary, pendingInteraction.channel);

    if (action === "DISPATCH") {
      if (!adjustedText || adjustedText.trim().length === 0) {
        return NextResponse.json({ error: "Cannot dispatch an empty text payload." }, { status: 400 });
      }

      const trimmedText = stripOperatorOnlyOutboundLines(adjustedText);
      if (!trimmedText) {
        return NextResponse.json({ error: "Cannot dispatch an empty text payload." }, { status: 400 });
      }
      const { subject } = parsePendingDraftSummary(pendingInteraction.summary);
      const dispatchSubject =
        draftKind === "SALES"
          ? subject
          : subject.startsWith("Re:")
            ? subject
            : `Re: ${subject}`;

      if (!contact?.id) {
        return NextResponse.json(
          { error: "Target contact configuration is missing." },
          { status: 422 },
        );
      }

      let channel: ApprovalDispatchChannel = "EMAIL";
      if (draftKind === "SALES") {
        if (body.dispatchChannel === "EMAIL" || body.dispatchChannel === "SMS") {
          channel = body.dispatchChannel;
        } else {
          channel = inferredSms ? "SMS" : "EMAIL";
        }
      }

      if (channel === "SMS") {
        const toPhone = normalizeE164Phone(body.recipientPhone ?? contact.phone);
        if (!toPhone) {
          return NextResponse.json(
            {
              error:
                "SMS dispatch requires a valid destination phone (E.164). Edit the phone field before DISPATCH.",
            },
            { status: 422 },
          );
        }

        if (contact.phone !== toPhone) {
          await prisma.ironboardCrmContact.update({
            where: { id: contact.id },
            data: { phone: toPhone },
          });
        }

        const sendResult = await sendOutboundSms({
          tenantId: pendingInteraction.tenantId,
          contactId: contact.id,
          to: toPhone,
          body: trimmedText,
        });

        if (!sendResult.success) {
          return NextResponse.json(
            {
              error: "SMS transport rejected the outbound payload.",
              details: sendResult.error ?? "Unknown provider failure.",
            },
            { status: 502 },
          );
        }

        const dispatchedTag = DISPATCHED_SALES_DRAFT_TAG;
        const updatedSummary = [
          `${dispatchedTag} ${subject}`,
          "--- Authorized Text Dispatched ---",
          trimmedText,
          "--- Trace Matrix ---",
          `Channel: SMS | To: ${toPhone} | Transitioned By: Manual Admin Override | Original Log Ref: ${interactionId}`,
          sendResult.messageSid
            ? `${sendResult.provider === "textbelt" ? "Textbelt textId" : "Twilio Message SID"}: ${sendResult.messageSid}`
            : "",
        ]
          .filter(Boolean)
          .join("\n");

        await prisma.ironboardCrmInteraction.update({
          where: { id: interactionId },
          data: {
            summary: updatedSummary.slice(0, 12_000),
            occurredAt: new Date(),
          },
        });

        console.log(
          `SMS dispatch complete. Interaction [${interactionId}] closed via ${sendResult.provider ?? "sms"}.`,
        );
        return NextResponse.json({
          status: "SUCCESS_DISPATCHED",
          channel: "SMS",
          to: toPhone,
          provider: sendResult.provider ?? "unknown",
          messageSid: sendResult.messageSid,
        });
      }

      const toEmail = sanitizeEmail(body.recipientEmail ?? contact.email);
      if (!toEmail) {
        return NextResponse.json(
          {
            error:
              "EMAIL dispatch requires a valid destination email. Edit the email field before DISPATCH.",
          },
          { status: 422 },
        );
      }

      if (contact.email.toLowerCase() !== toEmail) {
        await prisma.ironboardCrmContact.update({
          where: { id: contact.id },
          data: { email: toEmail },
        });
      }

      const sendResult = await sendOutboundEmail({
        tenantId: pendingInteraction.tenantId,
        contactId: contact.id,
        to: [toEmail],
        subject: dispatchSubject,
        html: `<p>${escapeHtml(trimmedText).replace(/\n/g, "<br />")}</p>`,
        text: trimmedText,
      });

      if (!sendResult.success) {
        return NextResponse.json(
          {
            error: "Resend transport rejected the outbound payload.",
            details: sendResult.error ?? "Unknown provider failure.",
          },
          { status: 502 },
        );
      }

      const dispatchedTag =
        draftKind === "SALES" ? DISPATCHED_SALES_DRAFT_TAG : DISPATCHED_DRAFT_TAG;
      const updatedSummary = [
        `${dispatchedTag} ${draftKind === "SALES" ? subject : "Re: Resolution update sent."}`,
        "--- Authorized Text Dispatched ---",
        trimmedText,
        "--- Trace Matrix ---",
        `Channel: EMAIL | To: ${toEmail} | Transitioned By: Manual Admin Override | Original Log Ref: ${interactionId}`,
        sendResult.emailId ? `Resend Message ID: ${sendResult.emailId}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await prisma.ironboardCrmInteraction.update({
        where: { id: interactionId },
        data: {
          summary: updatedSummary.slice(0, 12_000),
          occurredAt: new Date(),
        },
      });

      console.log(
        `Dispatch complete. Interaction [${interactionId}] closed and verified on wire.`,
      );
      return NextResponse.json({
        status: "SUCCESS_DISPATCHED",
        channel: "EMAIL",
        to: toEmail,
        emailId: sendResult.emailId,
      });
    }

    const purgedSummary = [
      "[PURGED DRAFT] This automated strategy suggestion was discarded by an operator.",
      "--- Discarded Copy Text ---",
      pendingInteraction.summary,
    ].join("\n");

    await prisma.ironboardCrmInteraction.update({
      where: { id: interactionId },
      data: {
        summary: purgedSummary.slice(0, 12_000),
        occurredAt: new Date(),
      },
    });

    console.log(`Purge operation complete. Draft interaction [${interactionId}] soft-archived.`);
    return NextResponse.json({ status: "SUCCESS_PURGED" });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : "Unknown error context.";
    console.error("Critical error encountered inside admin execution gate:", err);
    return NextResponse.json(
      { error: "Internal Workflow Processing Interruption", details },
      { status: 500 },
    );
  }
}
