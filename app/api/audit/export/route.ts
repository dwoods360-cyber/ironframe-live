import AdmZip from "adm-zip";
import { NextResponse } from "next/server";
import { getRiskAcceptanceDecisions } from "@/app/api/audit/riskAcceptanceStore";
import { getOutboundMailLog } from "@/app/utils/mailHub";

type ExportRequestBody = {
  entityId: "medshield" | "vaultbank" | "gridcore";
  dateRange: {
    from: string;
    to: string;
  };
};

function makeMinimalPdf(content: string) {
  return `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length ${content.length + 45} >>\nstream\nBT\n/F1 16 Tf\n72 720 Td\n(${content}) Tj\nET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000125 00000 n \n0000000278 00000 n \n0000000412 00000 n \ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n493\n%%EOF`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ExportRequestBody;
  const entityId = body?.entityId;
  const dateRange = body?.dateRange;

  if (!entityId || !dateRange?.from || !dateRange?.to) {
    return NextResponse.json({ ok: false, error: "entityId and dateRange.from/dateRange.to are required." }, { status: 400 });
  }

  const entityLabel = entityId.toUpperCase();
  const exportDate = new Date().toISOString().slice(0, 10);

  const auditLog = {
    entityId,
    range: dateRange,
    logs: [
      {
        timestamp: `${dateRange.from}T09:12:33Z`,
        actor: "AI_AUTOMATION_AGENT",
        action: "Remediation Applied",
        details: `${entityLabel} executed AI fix for edge node hardening.`,
      },
      {
        timestamp: `${dateRange.to}T15:42:10Z`,
        actor: "COMPLIANCE_ENGINE",
        action: "Questionnaire Submission Reviewed",
        details: `${entityLabel} vendor questionnaire delta validated.`,
      },
    ],
  };

  const databaseRemediationLogs = {
    entityId,
    source: "DATABASE_REMEDIATION_LOGS",
    records: [
      {
        timestamp: `${dateRange.from}T10:03:19Z`,
        actor: "AI_AUTOMATION_AGENT",
        action: "TECHNICAL_FIX",
        detail: `${entityLabel} remediation workflow executed. Risk exposure reduced by $1,500,000.`,
      },
      {
        timestamp: `${dateRange.to}T08:41:57Z`,
        actor: "POLICY_ENGINE",
        action: "POLICY_FIX",
        detail: `${entityLabel} policy control updated with 24hr patching SLA mandate.`,
      },
    ],
  };

  const riskAcceptanceLog = {
    entityId,
    source: "RISK_ACCEPTANCE_DECISIONS",
    records: getRiskAcceptanceDecisions(),
  };

  const vendorEmailReceiptLog = {
    entityId,
    source: "VENDOR_EMAIL_RECEIPTS",
    records: getOutboundMailLog()
      .filter((mail) => mail.channel === "VENDOR_DOC_REQUEST" || Boolean(mail.cadenceMilestone))
      .map((mail) => ({
        id: mail.id,
        vendorName: mail.vendorName ?? null,
        recipientEmail: mail.recipientEmail,
        recipientTitle: mail.recipientTitle,
        subject: mail.subject,
        sentAt: mail.sentAt,
        priority: mail.priority,
        cadenceMilestone: mail.cadenceMilestone,
        readStatus: mail.readStatus,
        readAt: mail.readAt,
        approvedSenderName: mail.approvedSenderName,
        approvedSenderEmail: mail.approvedSenderEmail,
        trackingPixelUrl: mail.trackingPixelUrl,
      })),
  };

  const cadenceEscalationLog = {
    entityId,
    source: "CADENCE_ESCALATION_RECEIPTS",
    records: getOutboundMailLog()
      .filter((mail) => Boolean(mail.cadenceMilestone))
      .map((mail) => ({
        id: mail.id,
        vendorName: mail.vendorName ?? null,
        recipientEmail: mail.recipientEmail,
        recipientTitle: mail.recipientTitle,
        milestone: mail.cadenceMilestone,
        priority: mail.priority,
        sentAt: mail.sentAt,
        readStatus: mail.readStatus,
        readAt: mail.readAt,
        approvedSenderName: mail.approvedSenderName,
        approvedSenderEmail: mail.approvedSenderEmail,
      })),
  };

  const evidenceLockerPdfs = [
    {
      fileName: `${entityLabel}_HIPAA_AUDIT_Q1_${exportDate}.pdf`,
      content: makeMinimalPdf(`${entityLabel} Evidence Locker PDF - HIPAA Audit Q1 ${exportDate}`),
    },
    {
      fileName: `${entityLabel}_REMEDIATION_ATTESTATION_${exportDate}.pdf`,
      content: makeMinimalPdf(`${entityLabel} Evidence Locker PDF - Remediation Attestation ${exportDate}`),
    },
  ];

  const zip = new AdmZip();
  zip.addFile("audit_log.json", Buffer.from(JSON.stringify(auditLog, null, 2), "utf-8"));
  zip.addFile("database_remediation_logs.json", Buffer.from(JSON.stringify(databaseRemediationLogs, null, 2), "utf-8"));
  zip.addFile("risk_acceptance_log.json", Buffer.from(JSON.stringify(riskAcceptanceLog, null, 2), "utf-8"));
  zip.addFile("vendor_email_receipts.json", Buffer.from(JSON.stringify(vendorEmailReceiptLog, null, 2), "utf-8"));
  zip.addFile("cadence_escalation_receipts.json", Buffer.from(JSON.stringify(cadenceEscalationLog, null, 2), "utf-8"));

  for (const evidence of evidenceLockerPdfs) {
    zip.addFile(`evidence-locker/${evidence.fileName}`, Buffer.from(evidence.content, "utf-8"));
  }

  const zipBuffer = zip.toBuffer();
  const zipBytes = new Uint8Array(zipBuffer);
  const bundleName = `${entityLabel}_AUDIT_BUNDLE_${exportDate}.zip`;

  return new NextResponse(zipBytes, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename=${bundleName}`,
      "x-audit-bundle-name": bundleName,
    },
  });
}
