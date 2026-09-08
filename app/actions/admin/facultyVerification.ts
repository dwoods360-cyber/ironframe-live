"use server";

import { requirePlatformAdministrator } from "@/app/lib/auth/platformAdminAccess";
import { mintFacultyMaterialsToken } from "@/app/lib/fellows/facultyMaterialsToken";
import { sendOutboundEmail } from "@/app/lib/server/sendOutboundEmail";
import prismaFellows from "@/lib/prismaFellows";

function materialsBaseUrl(): string {
  const fromEnv =
    process.env.FELLOWS_PUBLIC_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    const withProto = fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
    return withProto.replace(/\/$/, "");
  }
  return "https://fellows.ironframegrc.com";
}

export type FacultyQueueRow = {
  id: string;
  fullName: string;
  email: string;
  linkedInUrl: string;
  facultyCourseContext: string | null;
  facultyStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  createdAt: string;
  facultyMaterialsTokenExpiresAt: string | null;
};

export async function listFacultyApplicantsAction(): Promise<
  { ok: true; rows: FacultyQueueRow[] } | { ok: false; error: string }
> {
  const gate = await requirePlatformAdministrator();
  if ("error" in gate) return { ok: false, error: gate.error };

  const rows = await prismaFellows.fellow.findMany({
    where: { isFacultyApplicant: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      linkedInUrl: true,
      facultyCourseContext: true,
      facultyStatus: true,
      createdAt: true,
      facultyMaterialsTokenExpiresAt: true,
    },
  });

  return {
    ok: true,
    rows: rows
      .filter((r) => r.facultyStatus !== "NOT_APPLICABLE")
      .map((r) => ({
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        linkedInUrl: r.linkedInUrl,
        facultyCourseContext: r.facultyCourseContext,
        facultyStatus: r.facultyStatus as FacultyQueueRow["facultyStatus"],
        createdAt: r.createdAt.toISOString(),
        facultyMaterialsTokenExpiresAt:
          r.facultyMaterialsTokenExpiresAt?.toISOString() ?? null,
      })),
  };
}

export async function updateFacultyVerificationAction(input: {
  fellowId: string;
  status: "APPROVED" | "REJECTED" | "PENDING_REVIEW";
  adminNotes?: string;
}): Promise<
  | {
      ok: true;
      status: string;
      materialsUrl?: string;
      emailDispatched: boolean;
      emailError?: string;
    }
  | { ok: false; error: string }
> {
  const gate = await requirePlatformAdministrator();
  if ("error" in gate) return { ok: false, error: gate.error };

  const fellow = await prismaFellows.fellow.findUnique({
    where: { id: input.fellowId },
  });
  if (!fellow?.isFacultyApplicant) {
    return { ok: false, error: "Faculty applicant record not found." };
  }

  if (input.status === "REJECTED" || input.status === "PENDING_REVIEW") {
    await prismaFellows.fellow.update({
      where: { id: fellow.id },
      data: {
        facultyStatus: input.status,
        facultyReviewedAt: input.status === "REJECTED" ? new Date() : null,
        facultyAdminNotes: input.adminNotes?.trim() || null,
        facultyMaterialsTokenHash: null,
        facultyMaterialsTokenExpiresAt: null,
      },
    });
    return { ok: true, status: input.status, emailDispatched: false };
  }

  const minted = mintFacultyMaterialsToken();
  await prismaFellows.fellow.update({
    where: { id: fellow.id },
    data: {
      facultyStatus: "APPROVED",
      facultyReviewedAt: new Date(),
      facultyAdminNotes: input.adminNotes?.trim() || null,
      facultyMaterialsTokenHash: minted.tokenHash,
      facultyMaterialsTokenExpiresAt: minted.expiresAt,
      // Faculty may need an ACTIVE seat to use related APIs later.
      status: fellow.status === "REVOKED" ? "REVOKED" : "ACTIVE",
    },
  });

  const materialsUrl = `${materialsBaseUrl()}/faculty/materials?token=${minted.rawToken}`;
  const mail = await sendOutboundEmail({
    to: [fellow.email],
    subject: "Ironframe Fellows — faculty materials access (72h)",
    text: [
      `Hello ${fellow.fullName},`,
      "",
      "Your faculty materials access was approved.",
      `Open this link within 72 hours (do not forward):`,
      materialsUrl,
      "",
      "The link downloads an authenticated briefing — materials are not in a public folder.",
      "",
      "— Ironframe Academic Lab",
    ].join("\n"),
    tenantId: "fellows-academic",
    contactId: fellow.id,
  });

  return {
    ok: true,
    status: "APPROVED",
    materialsUrl,
    emailDispatched: mail.success,
    emailError: mail.success ? undefined : mail.error,
  };
}
