import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { requireSessionForDocumentationApi } from "@/app/lib/auth/requireSessionApi";

/** FS-backed docs ingress — must stay literal for Next.js static analysis (see docsRouteRuntime.ts). */
export const dynamic = "force-dynamic";

const PROTOCOL_DOCX = "Ironframe-UI-UX-Feature-Test-Protocol.docx";
const TEST_MATRIX_CSV = "Ironframe-UI-UX-Feature-Test-Matrix.csv";

/** UX / Feature Test Protocol manifest — selectors verified in production components. */
const FEATURE_TEST_MANIFEST = {
  version: "2026-06-02",
  artifact: PROTOCOL_DOCX,
  matrixCsv: TEST_MATRIX_CSV,
  chapters: [
    { id: "ch1", track1: "docs/product/vision_and_overview_track1.html", track2: "docs/product/business_plan_spec_track2.html" },
    { id: "ch2", track1: "docs/support/self_healing_guide_track1.html", track2: "docs/support/operations_triage_spec.html" },
    { id: "ch3", track1: "docs/technical/integration_basics_track1.html", track2: "docs/technical/data_dictionary_and_api_track2.html" },
  ],
  uiLabels: {
    agentStatusPulse: "AGENT STATUS PULSE",
    navTabs: ["AUDIT TRAIL", "INTEGRITY HUB", "BOARD REPORT", "OP SUPPORT", "DMZ QUARANTINE"],
    freezeCommandPost: "FREEZE COMMAND POST",
    cyberInsuranceOptimization: "Cyber insurance optimization",
    exportTabularLedgerCsv: "Export Tabular Ledger Data (CSV)",
  },
  testSelectors: [
    {
      testCaseId: "EXPORT-001",
      dataTestId: "export-tabular-ledger-csv",
      component: "components/BudgetJustification.tsx",
      description: "Whole-integer cents CSV export from CYBER INSURANCE OPTIMIZATION card",
    },
    {
      testCaseId: "TENANT-001",
      dataTestId: "scrutiny-block",
      component: "app/components/DashboardHomeClient.tsx",
      description: "GRC ALE exposure map scrutiny block",
    },
    {
      testCaseId: "UX-002",
      dataTestId: "grc-ale-exposure-map",
      component: "app/components/GrcAleExposureMap.tsx",
      description: "Financial integrity metric cards row",
    },
  ],
  financialBaselinesCents: {
    medshield: "1110000000",
    vaultbank: "590000000",
    gridcore: "470000000",
  },
  ironbloomPhysicalUnits: ["kWh", "L", "km"],
  ironbloomRejectionCode: "PHYSICAL_UNIT_REQUIRED",
} as const;

function protocolDocxPath(): string {
  return path.join(process.cwd(), "docs", PROTOCOL_DOCX);
}

export async function GET(request: NextRequest) {
  const denied = await requireSessionForDocumentationApi();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const manifestOnly = searchParams.get("manifest") === "1" || searchParams.get("format") === "json";

  if (manifestOnly) {
    const matrixPath = path.join(process.cwd(), "docs", TEST_MATRIX_CSV);
    return NextResponse.json({
      ...FEATURE_TEST_MANIFEST,
      matrixAvailable: fs.existsSync(matrixPath),
      protocolDocxAvailable: fs.existsSync(protocolDocxPath()),
    });
  }

  const filePath = protocolDocxPath();

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      {
        error: "Testing protocol artifact missing from node directory storage.",
        manifest: FEATURE_TEST_MANIFEST,
      },
      { status: 404 },
    );
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${PROTOCOL_DOCX}"`,
      "X-Ironframe-Test-Manifest": "GET ?manifest=1 for EXPORT-001 selectors",
      "X-Ironframe-Export-TestId": "export-tabular-ledger-csv",
    },
  });
}
