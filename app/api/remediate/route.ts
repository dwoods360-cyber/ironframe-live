import { NextRequest, NextResponse } from "next/server";
import { TenantKey } from "@/app/utils/tenantIsolation";
import { calculateFinancialImpact } from "@/app/utils/scoring";

const ASSET_ENTITY_MAP: Record<string, TenantKey> = {
  "ms-cloud-ehr": "medshield",
  "ms-telehealth-v3": "medshield",
  "ms-inpatient-nodes": "medshield",
  "vb-hft-engine": "vaultbank",
  "vb-swift-core": "vaultbank",
  "vb-ledger-v2": "vaultbank",
  "gc-substation-v4": "gridcore",
  "gc-transmission-node": "gridcore",
  "gc-scada-terminal": "gridcore",
};

const REMEDIATION_HISTORY: string[] = [];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const assetId = body?.assetId as string | undefined;
  const remediationType = body?.remediationType as string | undefined;
  const user = (body?.user as string | undefined) ?? "AI_OPERATOR";

  if (!assetId || !remediationType) {
    return NextResponse.json({ ok: false, error: "assetId and remediationType are required." }, { status: 400 });
  }

  const entity = ASSET_ENTITY_MAP[assetId];
  if (!entity) {
    return NextResponse.json({ ok: false, error: `Unknown assetId: ${assetId}` }, { status: 404 });
  }

  const impact = calculateFinancialImpact(entity, "CRITICAL");
  const riskReduction = impact.criticalPerEventImpact;
  const auditRecord = `${user} executed AI-suggested fix for ${assetId}. Risk exposure reduced by $${riskReduction.toLocaleString()}.`;

  REMEDIATION_HISTORY.unshift(auditRecord);

  return NextResponse.json({
    ok: true,
    assetId,
    remediationType,
    status: "SECURE",
    entity,
    riskReduction,
    auditRecord,
    history: REMEDIATION_HISTORY.slice(0, 20),
  });
}
