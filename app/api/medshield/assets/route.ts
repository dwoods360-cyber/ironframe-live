import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    tenant: "MEDSHIELD",
    assets: [
      { id: "ms-asset-1", name: "Cloud EHR", status: "SECURE" },
      { id: "ms-asset-2", name: "Remote Telehealth V3", status: "VULNERABLE" },
      { id: "ms-asset-3", name: "In-Patient Nodes", status: "SECURE" },
    ],
  });
}
