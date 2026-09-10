import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { issueFellowAccessVerification } from "@/app/lib/fellows/accessVerification";
import { fellowsSandboxExpiryFrom } from "@/app/lib/fellows/sandboxTtl";
import {
  FELLOWS_ACADEMIC_SANDBOX_ID,
} from "@/config/fellowsPortal";
import prismaFellows from "@/lib/prismaFellows";

export const runtime = "nodejs";

const ApplySchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    linkedInUrl: z
      .string()
      .trim()
      .url()
      .refine((u) => /linkedin\.com/i.test(u), "LinkedIn profile URL required"),
    academicTrack: z.enum([
      "MSCSIA_CAPSTONE",
      "MSCSIA_COURSEWORK",
      "BS_CYBERSECURITY",
      "ALUMNI_PRACTITIONER",
    ]),
    labFocus: z.enum([
      "EXPOSURE_MATH",
      "MULTI_TENANT_EVIDENCE",
      "TPRM_INGEST",
      "CAPSTONE_DATASET",
    ]),
    employerType: z.enum([
      "MSP_MSSP",
      "REGIONAL_BANKING",
      "HEALTHCARE",
      "DEFENSE_CONTRACTOR",
      "ENTERPRISE_IT",
      "NON_COMMERCIAL_STUDENT",
      "OTHER",
    ]),
    employmentContext: z.string().trim().max(120).optional(),
    requestArchitectureBrief: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.employerType === "OTHER") {
      const note = data.employmentContext?.trim() ?? "";
      if (note.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Current employment is required when employer type is Other",
          path: ["employmentContext"],
        });
      }
    }
  });

/**
 * Create a pending application and email a proof-of-ownership link. Existing records are never
 * mutated from this public endpoint until mailbox ownership has been proved.
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const body = ApplySchema.parse(raw);
    const email = body.email.toLowerCase();
    const employmentContext =
      body.employerType === "OTHER" ? (body.employmentContext?.trim() ?? null) : null;
    const sandboxExpiresAt = fellowsSandboxExpiryFrom();

    const existing = await prismaFellows.fellow.findUnique({ where: { email } });
    const fellow = existing
      ? existing
      : await prismaFellows.fellow.create({
        data: {
          email,
          fullName: body.fullName,
          linkedInUrl: body.linkedInUrl,
          academicTrack: body.academicTrack,
          labFocus: body.labFocus,
          employerType: body.employerType,
          employmentContext,
          requestArchitectureBrief: body.requestArchitectureBrief,
          sandboxExpiresAt,
          status: "PENDING_VERIFY",
          tenantEnclaveId: FELLOWS_ACADEMIC_SANDBOX_ID,
        },
      });

    const issued =
      fellow.status !== "REVOKED"
        ? await issueFellowAccessVerification({
            fellowId: fellow.id,
            email: fellow.email,
            requestOrigin: req.nextUrl.origin,
            lastRequestedAt: fellow.accessTokenRequestedAt,
          }).catch((error) => {
            console.error(
              "[fellows/apply] access-link issue failed",
              error instanceof Error ? error.message : "unknown issue error",
            );
            return null;
          })
        : null;

    return NextResponse.json(
      {
        accepted: true,
        message: "Check your email for a single-use link to activate or resume Fellow access.",
        ...(issued?.devVerifyUrl ? { devVerifyUrl: issued.devVerifyUrl } : {}),
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid application", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error("[fellows/apply]", error);
    return NextResponse.json({ error: "Unable to process application" }, { status: 500 });
  }
}
