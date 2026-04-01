import { render } from "@react-email/render";
import React, { type ComponentType } from "react";
import { Resend } from "resend";

import { AuditNoticeEmail } from "@/emails/AuditNoticeEmail";
import { UrgentThreatEmail } from "@/emails/UrgentThreatEmail";
import { VendorAlertEmail } from "@/emails/VendorAlertEmail";
import { logStructuredEvent } from "@/lib/structuredServerLog";
import type { IroncastDispatchPayload } from "@/types/ironcast";

type IroncastEmailTemplateProps = {
  tenantName: string;
  riskId: string;
  summary: string;
  priority: string;
};

function resolveEmailTemplate(
  priority: IroncastDispatchPayload["notification"]["priority"],
): ComponentType<IroncastEmailTemplateProps> {
  switch (priority) {
    case "URGENT":
      return UrgentThreatEmail;
    case "HIGH":
      return VendorAlertEmail;
    case "NOTICE":
      return AuditNoticeEmail;
    default: {
      const _exhaustive: never = priority;
      return _exhaustive;
    }
  }
}

/**
 * IroncastService
 * Handles professional HTML egress via React Email.
 */
export class IroncastService {
  static async dispatch(payload: IroncastDispatchPayload): Promise<{ success: boolean; id?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("TAS_VIOLATION: RESEND_API_KEY is missing.");

    const resend = new Resend(apiKey);

    // 1. Gate Check: Verify Agent 14 (Irongate) Attestation
    if (
      payload.sanitization_status !== "CLEANED" &&
      payload.sanitization_status !== "VERIFIED_SYSTEM_GENERATED"
    ) {
      throw new Error("TAS_VIOLATION: Ironcast refused unsanitized payload.");
    }

    if (!payload.irongate_trace_id?.trim()) {
      throw new Error("TAS_VIOLATION: Irongate trace ID is required for Zero-Trust egress.");
    }

    // 2. Render template by priority (URGENT → Ironlock, HIGH → Ironmap, NOTICE → Irontally)
    const Template = resolveEmailTemplate(payload.notification.priority);
    const emailHtml = await render(
      React.createElement(Template, {
        tenantName: payload.tenant_id,
        riskId: payload.notification.risk_id || "N/A",
        summary: payload.notification.body_summary,
        priority: payload.notification.priority,
      }),
    );

    try {
      const { data, error } = await resend.emails.send({
        from: `${process.env.IRONCAST_FROM_NAME || "Ironframe Agents"} <onboarding@resend.dev>`,
        to: [payload.recipient.email],
        subject: `[${payload.notification.priority}] ${payload.notification.subject}`,
        html: emailHtml, // Dispatching professional HTML
        headers: {
          "X-Ironframe-Tenant-ID": payload.tenant_id,
          "X-Ironframe-Trace-ID": payload.irongate_trace_id,
        },
      });

      if (error) {
        logStructuredEvent("Ironcast", "provider_error", { detail: String(error) }, "error");
        return { success: false };
      }

      return { success: true, id: data?.id };
    } catch (err) {
      logStructuredEvent(
        "Ironcast",
        "fatal_dispatch_failure",
        { detail: err instanceof Error ? err.message : String(err) },
        "error",
      );
      return { success: false };
    }
  }
}
