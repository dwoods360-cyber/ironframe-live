import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { mintFellowSessionToken } from "@/app/lib/fellows/session";
import { fellowsSandboxExpiryFrom } from "@/app/lib/fellows/sandboxTtl";
import {
  FELLOWS_ACADEMIC_SANDBOX_ID,
  FELLOWS_SESSION_COOKIE,
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
 * Phase 1: auto-activate so lab is usable immediately.
 * Ops can later flip PENDING_VERIFY for stricter cohorts.
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
    const fellow =
      existing ??
      (await prismaFellows.fellow.create({
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
          status: "ACTIVE",
          tenantEnclaveId: FELLOWS_ACADEMIC_SANDBOX_ID,
        },
      }));

    if (existing && existing.status === "REVOKED") {
      return NextResponse.json({ error: "Access revoked" }, { status: 403 });
    }

    if (existing) {
      await prismaFellows.fellow.update({
        where: { id: existing.id },
        data: {
          status: existing.status === "ACTIVE" ? existing.status : "ACTIVE",
          fullName: body.fullName,
          linkedInUrl: body.linkedInUrl,
          academicTrack: body.academicTrack,
          labFocus: body.labFocus,
          employerType: body.employerType,
          employmentContext,
          requestArchitectureBrief: body.requestArchitectureBrief,
          sandboxExpiresAt: existing.sandboxExpiresAt ?? sandboxExpiresAt,
        },
      });
    }

    const token = mintFellowSessionToken(fellow.id);
    const res = NextResponse.json({
      success: true,
      fellowId: fellow.id,
      tenantEnclaveId: fellow.tenantEnclaveId,
      sandboxExpiresAt: (existing?.sandboxExpiresAt ?? sandboxExpiresAt).toISOString(),
      labPath: "/fellows/lab",
      note: "Independent Ironframe academic lab — not a WGU-operated site.",
    });
    res.cookies.set(FELLOWS_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
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
