import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { countTenantQuarantineHardBans } from "@/app/lib/security/quarantineLedgerRead";
import { assertAuthenticatedIronguardTenantOr403 } from "@/app/lib/security/tenantMembershipGuard";

export const dynamic = "force-dynamic";

/**
 * Read-only Ironlock global state freeze + quarantine hard-ban (Gavel) for Ironwatch / Command Post.
 * Does not expose operational internals beyond boolean flags.
 */
export async function GET(request: NextRequest) {
  try {
    const guard = await assertAuthenticatedIronguardTenantOr403(request);
    if (!guard.ok) return guard.response;
    const tenantUuid = guard.tenantUuid;
    let ironlockGlobalStateFreezeActive = false;
    let quarantineHardBanActive = false;

    try {
      const cfg = await prisma.systemConfig.findUnique({
        where: { id: "global" },
        select: { stateFreezeActive: true },
      });
      ironlockGlobalStateFreezeActive = cfg?.stateFreezeActive === true;
    } catch {
      /* systemConfig optional in partial DB — treat as unfrozen */
    }

    try {
      const hardBanCount = await countTenantQuarantineHardBans(tenantUuid);
      quarantineHardBanActive = hardBanCount > 0;
    } catch {
      /* countTenantQuarantineHardBans should not throw; belt-and-suspenders */
    }

    return NextResponse.json(
      {
        ok: true,
        ironlockGlobalStateFreezeActive,
        quarantineHardBanActive,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (e) {
    console.error("[api/ironwatch/layout-signal]", e);
    return NextResponse.json(
      {
        ok: false,
        ironlockGlobalStateFreezeActive: false,
        quarantineHardBanActive: false,
        error: e instanceof Error ? e.message : "layout-signal unavailable",
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}
