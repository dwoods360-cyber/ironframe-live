import { NextResponse } from "next/server";

type RegulationItem = {
  id: string;
  title: string;
  region: string;
  severity: "HIGH" | "MEDIUM";
  publishedAt: string;
};

type RegulatoryTask = {
  id: string;
  title: string;
  priority: "HIGH";
  badge: "NEW REGULATION";
  sourceRegulationId: string;
  sourceRegulationTitle: string;
  status: "OPEN";
  createdAt: string;
};

type VendorRegulatoryFeedItem = {
  vendorName: string;
  source: "Vendor Hub" | "Nth-Party Map";
  regulatoryStatus: "COMPLIANT" | "UNDER REVIEW" | "VIOLATION DETECTED";
};

export async function POST() {
  const now = new Date().toISOString();
  const toggle = new Date(now).getUTCSeconds() % 2 === 0;

  const detectedRegulations: RegulationItem[] = [
    {
      id: "reg-dora-update-v2",
      title: "DORA Update v2",
      region: "EU",
      severity: "HIGH",
      publishedAt: now,
    },
    {
      id: "reg-iso-27001-annex-a-refresh",
      title: "ISO 27001 Annex A Refresh",
      region: "GLOBAL",
      severity: "MEDIUM",
      publishedAt: now,
    },
  ];

  const autoTasks: RegulatoryTask[] = detectedRegulations
    .filter((regulation) => regulation.severity === "HIGH")
    .map((regulation) => ({
      id: `task-${regulation.id}`,
      title: "Review Encryption Policy",
      priority: "HIGH",
      badge: "NEW REGULATION",
      sourceRegulationId: regulation.id,
      sourceRegulationTitle: regulation.title,
      status: "OPEN",
      createdAt: now,
    }));

  const vendorRegulatoryFeed: VendorRegulatoryFeedItem[] = [
    {
      vendorName: "Azure Health",
      source: "Vendor Hub",
      regulatoryStatus: toggle ? "UNDER REVIEW" : "COMPLIANT",
    },
    {
      vendorName: "KubeOps EU-West",
      source: "Nth-Party Map",
      regulatoryStatus: toggle ? "VIOLATION DETECTED" : "UNDER REVIEW",
    },
    {
      vendorName: "SWIFT",
      source: "Vendor Hub",
      regulatoryStatus: "COMPLIANT",
    },
  ];

  return NextResponse.json({
    ok: true,
    syncedAt: now,
    detectedRegulations,
    autoTasks,
    vendorRegulatoryFeed,
    ticker: detectedRegulations.map((regulation) => `${regulation.title} (${regulation.region})`),
  });
}
