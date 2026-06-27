import { NextRequest, NextResponse } from "next/server";

import { canUsePlatformAdminTools } from "@/app/lib/auth/platformAdminAccess";
import {
  assertTenantBillingActive,
  TenantBillingHoldError,
  tenantBillingHoldJsonResponse,
} from "@/app/lib/billing/tenantBillingEntitlement";
import { assertIronguardApiTenantOr403 } from "@/app/lib/security/ironguardApiGuard";
import { loadAppDocumentForReader } from "@/app/lib/server/loadAppDocumentForReader";
import {
  formatOperatorDocTitle,
  isOperatorFacingReadingLevel,
  prepareDocContentForDisplay,
} from "@/lib/docsContentDecoupling";
import { normalizeAppDocumentSlug } from "@/lib/appDocumentSlug";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await assertIronguardApiTenantOr403(req);
  if (!guard.ok) {
    return guard.response;
  }

  try {
    const platformAdmin = await canUsePlatformAdminTools();
    await assertTenantBillingActive(guard.tenantUuid!, { platformAdminBypass: platformAdmin });
  } catch (err) {
    if (err instanceof TenantBillingHoldError) {
      return tenantBillingHoldJsonResponse(err);
    }
    throw err;
  }

  const rawSlug = req.nextUrl.searchParams.get("slug");
  const slug = rawSlug ? normalizeAppDocumentSlug(rawSlug) : "";
  if (!slug) {
    return NextResponse.json({ error: "slug query parameter is required." }, { status: 400 });
  }

  const docRecord = await loadAppDocumentForReader(slug);

  if (!docRecord) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const operatorView = isOperatorFacingReadingLevel(docRecord.readingLevel);

  return NextResponse.json({
    slug: docRecord.slug,
    title: operatorView ? formatOperatorDocTitle(docRecord.title) : docRecord.title,
    readingLevel: docRecord.readingLevel,
    operatorView,
    source: docRecord.source,
    content: prepareDocContentForDisplay(docRecord.content, {
      readingLevel: docRecord.readingLevel,
      title: docRecord.title,
    }),
  });
}
