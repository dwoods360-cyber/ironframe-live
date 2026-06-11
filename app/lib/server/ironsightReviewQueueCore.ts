import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { parseIngestionDetailsForMerge } from "@/app/utils/ingestionDetailsMerge";
import {
  resolveDevConstitutionalAuthorityUserId,
} from "@/app/lib/grc/devConstitutionalElevation";
import {
  getScopedTenantUuidFromCookies,
  resolveTenantUuidForThreatScope,
} from "@/app/utils/serverTenantContext";
import {
  hitlCategoryRequiresCisoAdmin,
  hitlTenantScopeLabel,
  parseHitlCategoryFromApprovalNote,
  type HitlReviewCategory,
} from "@/app/utils/hitlReviewQueue";
import { getSupabaseSessionUser } from "@/app/utils/serverAuth";
import {
  isSimulationRequestAbortError,
  prismaAbortOptions,
  throwIfAborted,
} from "@/app/lib/server/simulationRequestAbort";

const HANDSHAKE_ROLE_COOKIE = "ironframe-handshake-role";

const THREAT_RESOLUTION_APPROVER_ROLES: UserRole[] = [
  "GRC_MANAGER",
  "GLOBAL_ADMIN",
  "CISO",
  "DIRECTOR_OF_COMPLIANCE",
];

const HITL_CISO_ADMIN_ROLES: UserRole[] = ["CISO", "GLOBAL_ADMIN"];

async function actorMayReviewHitlApproval(
  sessionUser: Awaited<ReturnType<typeof getSupabaseSessionUser>>,
  userId: string,
  tenantUuid: string,
  category: HitlReviewCategory,
  handshakeRaw: string | undefined,
): Promise<boolean> {
  const devUid = await resolveDevConstitutionalAuthorityUserId(sessionUser, tenantUuid);
  if (devUid) return true;

  const elevated = hitlCategoryRequiresCisoAdmin(category);
  const handshake = (handshakeRaw ?? "").trim().toUpperCase();
  if (elevated) {
    if (handshake === "CISO" || handshake === "ADMIN") return true;
    const row = await prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        tenantId: tenantUuid,
        role: { in: [...HITL_CISO_ADMIN_ROLES] },
      },
      select: { id: true },
    });
    return row != null;
  }
  const row = await prisma.userRoleAssignment.findFirst({
    where: {
      userId,
      tenantId: tenantUuid,
      role: { in: [...THREAT_RESOLUTION_APPROVER_ROLES] },
    },
    select: { id: true },
  });
  if (row) return true;
  if (handshake === "CISO" || handshake === "ADMIN") return true;
  return false;
}

export type PendingThreatResolutionItem = {
  approvalId: string;
  threatId: string;
  threatTitle: string;
  targetEntity: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedByUserId: string;
  approvalNote: string;
  createdAt: string;
  tenantId: string;
  hitlCategory: HitlReviewCategory;
  requiresCisoAdmin: boolean;
  tenantScopeLabel: "Ironframe" | "Client";
  pendingLedgerCents: string | null;
  canReview: boolean;
};

export type IronsightReviewQueueResult =
  | { ok: true; items: PendingThreatResolutionItem[]; tenantId: string | null }
  | { ok: false; error: string; items: []; aborted?: boolean };

/** Agent 08 — HITL pending approval read path (threatApproval only; no baseline ledger writes). */
export async function listPendingThreatResolutionsCore(
  tenantUuidOverride?: string | null,
  signal?: AbortSignal | null,
): Promise<IronsightReviewQueueResult> {
  try {
    throwIfAborted(signal);
    const scopedTenant = tenantUuidOverride?.trim()
      ? await resolveTenantUuidForThreatScope(tenantUuidOverride.trim())
      : await getScopedTenantUuidFromCookies();

    throwIfAborted(signal);

    if (!scopedTenant) {
      return { ok: true, items: [], tenantId: null };
    }

    const user = await getSupabaseSessionUser();
    throwIfAborted(signal);
    const reviewerUserId = user?.id?.trim() ?? "";
    const jar = await cookies();
    const handshakeRole = jar.get(HANDSHAKE_ROLE_COOKIE)?.value;

    throwIfAborted(signal);

    const rows = await prisma.threatApproval.findMany({
      where: { status: "PENDING", tenantId: scopedTenant },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        threatId: true,
        tenantId: true,
        status: true,
        requestedByUserId: true,
        approvalNote: true,
        createdAt: true,
        threat: {
          select: {
            title: true,
            targetEntity: true,
            ingestionDetails: true,
          },
        },
      },
      ...prismaAbortOptions(signal),
    });

    throwIfAborted(signal);

    const items: PendingThreatResolutionItem[] = [];
    for (const row of rows) {
      throwIfAborted(signal);
      const hitlCategory = parseHitlCategoryFromApprovalNote(row.approvalNote);
      const requiresCisoAdmin = hitlCategoryRequiresCisoAdmin(hitlCategory);
      let pendingLedgerCents: string | null = null;
      try {
        const j = parseIngestionDetailsForMerge(row.threat?.ingestionDetails ?? null) as {
          hitlReview?: { pendingLedgerCents?: string };
        };
        pendingLedgerCents =
          typeof j?.hitlReview?.pendingLedgerCents === "string"
            ? j.hitlReview.pendingLedgerCents
            : null;
      } catch {
        pendingLedgerCents = null;
      }

      const canReview =
        reviewerUserId.length > 0
          ? await actorMayReviewHitlApproval(
              user,
              reviewerUserId,
              row.tenantId,
              hitlCategory,
              handshakeRole,
            )
          : false;

      throwIfAborted(signal);

      items.push({
        approvalId: row.id,
        threatId: row.threatId,
        threatTitle: row.threat?.title ?? row.threatId,
        targetEntity: row.threat?.targetEntity ?? null,
        status: row.status,
        requestedByUserId: row.requestedByUserId,
        approvalNote: row.approvalNote ?? "",
        createdAt:
          row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date().toISOString(),
        tenantId: row.tenantId,
        hitlCategory,
        requiresCisoAdmin,
        tenantScopeLabel: hitlTenantScopeLabel(row.tenantId),
        pendingLedgerCents,
        canReview,
      });
    }

    throwIfAborted(signal);
    return { ok: true, items, tenantId: scopedTenant };
  } catch (error) {
    if (isSimulationRequestAbortError(error)) {
      return { ok: false, error: "", items: [], aborted: true };
    }
    const message = error instanceof Error ? error.message : "Failed to load pending resolutions.";
    return { ok: false, error: message, items: [] };
  }
}
