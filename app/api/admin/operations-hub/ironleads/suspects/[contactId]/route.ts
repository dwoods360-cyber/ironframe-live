import { NextRequest, NextResponse } from "next/server";

import { requirePerimeterWorkforceOperator } from "@/app/lib/auth/perimeterWorkforceAccess";
import { buildIronleadsSuspectReport } from "@/app/lib/server/ironleadsSuspectReportCore";
import { updateIronleadsSuspectContact } from "@/app/lib/server/ironleadsSuspectOperatorUpdateCore";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ contactId: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { contactId } = await context.params;
  const report = await buildIronleadsSuspectReport(contactId);
  if (!report) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, report });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requirePerimeterWorkforceOperator();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { contactId } = await context.params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await updateIronleadsSuspectContact(contactId, {
    fullName: typeof body.fullName === "string" ? body.fullName : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    phone:
      body.phone === null
        ? null
        : typeof body.phone === "string"
          ? body.phone
          : undefined,
    title: typeof body.title === "string" ? body.title : undefined,
    company: typeof body.company === "string" ? body.company : undefined,
    websiteUrl:
      body.websiteUrl === null
        ? null
        : typeof body.websiteUrl === "string"
          ? body.websiteUrl
          : undefined,
    addressLine:
      body.addressLine === null
        ? null
        : typeof body.addressLine === "string"
          ? body.addressLine
          : undefined,
    namedBuyerFullName:
      body.namedBuyerFullName === null
        ? null
        : typeof body.namedBuyerFullName === "string"
          ? body.namedBuyerFullName
          : undefined,
    namedBuyerTitle:
      body.namedBuyerTitle === null
        ? null
        : typeof body.namedBuyerTitle === "string"
          ? body.namedBuyerTitle
          : undefined,
    clearNamedBuyer: body.clearNamedBuyer === true,
    promoteToProspect: body.promoteToProspect === true,
    operatorNote: typeof body.operatorNote === "string" ? body.operatorNote : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, report: result.report });
}
