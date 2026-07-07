import "server-only";

import fs from "fs";
import path from "path";

import type { IronboardLeadStage } from "@prisma/client";

import {
  fetchPendingApprovalDrafts,
  type DraftKind,
} from "@/app/lib/server/approvalQueueCore";
import {
  BRIEFING_QUEUE_DIR,
  PUBLISHED_BRIEFINGS_DIR,
  resolveDocsRoot,
} from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import {
  isNonPromotableBriefingDraft,
  parseBriefingDraftAlertFlags,
  QUARANTINE_ALLOWLIST,
  validateBriefingQueueDraft,
  type BriefingDraftValidationIssue,
} from "@/app/lib/governanceFrame/briefingDraftValidation";
import { parseTitleFromMarkdown } from "@/app/lib/governanceFrame/briefingMarkdown";
import prisma from "@/lib/prisma";

export type WorkforceServiceId =
  | "ironboard"
  | "ironleads"
  | "salesteam"
  | "success-team";

export type WorkforceServiceStatus = {
  id: WorkforceServiceId;
  label: string;
  port: number;
  healthUrl: string;
  consoleUrl: string | null;
  role: string;
  reachable: boolean;
  status: string | null;
  latencyMs: number | null;
};

export type BriefingQueueDraftSummary = {
  filename: string;
  title: string;
  modifiedAt: string;
  promotable: boolean;
  requiresImmediatePromotion: boolean;
  validationOk: boolean;
  issues: BriefingDraftValidationIssue[];
};

export type OperationsHubSnapshot = {
  generatedAt: string;
  approvals: {
    total: number;
    byKind: Record<DraftKind, number>;
  };
  crm: {
    totalDeals: number;
    totalContacts: number;
    byStage: Record<IronboardLeadStage, number>;
    recentSuspects: Array<{
      id: string;
      company: string;
      priorityScore: number;
      detectedTrigger: string | null;
      createdAt: string;
    }>;
  };
  briefings: {
    queueDrafts: BriefingQueueDraftSummary[];
    published: Array<{
      slug: string;
      title: string;
      publishedAt: string;
      tenantId: string;
    }>;
  };
  workforce: WorkforceServiceStatus[];
  quickLinks: Array<{ label: string; href: string; external?: boolean }>;
};

const CRM_STAGES: IronboardLeadStage[] = [
  "SUSPECT",
  "PROSPECT",
  "QUALIFIED",
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

function serviceBaseUrl(envKey: string, fallbackPort: number): string {
  const raw = process.env[envKey]?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return `http://127.0.0.1:${fallbackPort}`;
}

async function probeWorkerHealth(
  id: WorkforceServiceId,
  label: string,
  port: number,
  envKey: string,
  role: string,
  consolePath: string | null,
): Promise<WorkforceServiceStatus> {
  const base = serviceBaseUrl(envKey, port);
  const healthUrl = `${base}/health`;
  const started = Date.now();
  try {
    const response = await fetch(healthUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    const latencyMs = Date.now() - started;
    let status: string | null = null;
    try {
      const body = (await response.json()) as { status?: string; service?: string };
      status = body.status ?? body.service ?? null;
    } catch {
      status = response.ok ? "OK" : `HTTP ${response.status}`;
    }
    return {
      id,
      label,
      port,
      healthUrl,
      consoleUrl: consolePath ? `${base}${consolePath}` : null,
      role,
      reachable: response.ok,
      status,
      latencyMs,
    };
  } catch {
    return {
      id,
      label,
      port,
      healthUrl,
      consoleUrl: consolePath ? `${base}${consolePath}` : null,
      role,
      reachable: false,
      status: null,
      latencyMs: Date.now() - started,
    };
  }
}

function listBriefingQueueDrafts(docsRoot: string): BriefingQueueDraftSummary[] {
  const queueDir = path.join(docsRoot, BRIEFING_QUEUE_DIR);
  if (!fs.existsSync(queueDir)) return [];

  return fs
    .readdirSync(queueDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .filter((entry) => !QUARANTINE_ALLOWLIST.has(entry.name.toLowerCase()))
    .map((entry) => {
      const filePath = path.join(queueDir, entry.name);
      const markdown = fs.readFileSync(filePath, "utf-8");
      const stat = fs.statSync(filePath);
      const validation = validateBriefingQueueDraft(entry.name, markdown);
      const alertFlags = parseBriefingDraftAlertFlags(markdown);
      return {
        filename: entry.name,
        title: parseTitleFromMarkdown(markdown, entry.name),
        modifiedAt: stat.mtime.toISOString(),
        promotable: !isNonPromotableBriefingDraft(entry.name),
        requiresImmediatePromotion: alertFlags.requiresImmediatePromotion,
        validationOk: validation.ok,
        issues: validation.issues,
      };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

export async function buildOperationsHubSnapshot(): Promise<OperationsHubSnapshot> {
  const [drafts, dealGroups, contactCount, recentSuspects, publishedRows, workforce] =
    await Promise.all([
      fetchPendingApprovalDrafts(),
      prisma.ironboardCrmDeal.groupBy({
        by: ["stage"],
        _count: { _all: true },
      }),
      prisma.ironboardCrmContact.count(),
      prisma.ironboardCrmContact.findMany({
        where: { primaryDeals: { some: { stage: "SUSPECT" } } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          company: true,
          priorityScore: true,
          detectedTrigger: true,
          createdAt: true,
        },
      }),
      prisma.publishedBriefing.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          slug: true,
          title: true,
          createdAt: true,
          tenantId: true,
        },
      }),
      Promise.all([
        probeWorkerHealth(
          "ironboard",
          "Ironboard",
          8082,
          "OPERATIONS_IRONBOARD_URL",
          "17-agent boardroom · CRM tools · market flywheel",
          "/",
        ),
        probeWorkerHealth(
          "ironleads",
          "Ironleads",
          8083,
          "OPERATIONS_IRONLEADS_URL",
          "OSINT harvest → SUSPECT CRM ingress",
          null,
        ),
        probeWorkerHealth(
          "salesteam",
          "SalesTeam",
          8084,
          "OPERATIONS_SALESTEAM_URL",
          "PROSPECT outreach drafts → approval queue",
          null,
        ),
        probeWorkerHealth(
          "success-team",
          "IronSuccessTeam",
          8085,
          "OPERATIONS_SUCCESS_TEAM_URL",
          "CLOSED_WON health advisories → CS approval queue",
          null,
        ),
      ]),
    ]);

  const byKind: Record<DraftKind, number> = {
    SUPPORT: 0,
    SALES: 0,
    CUSTOMER_SUCCESS: 0,
  };
  for (const draft of drafts) {
    byKind[draft.draftKind] += 1;
  }

  const byStage = Object.fromEntries(
    CRM_STAGES.map((stage) => [stage, 0]),
  ) as Record<IronboardLeadStage, number>;
  let totalDeals = 0;
  for (const row of dealGroups) {
    byStage[row.stage] = row._count._all;
    totalDeals += row._count._all;
  }

  const docsRoot = resolveDocsRoot();
  const queueDrafts = listBriefingQueueDrafts(docsRoot);

  return {
    generatedAt: new Date().toISOString(),
    approvals: {
      total: drafts.length,
      byKind,
    },
    crm: {
      totalDeals,
      totalContacts: contactCount,
      byStage,
      recentSuspects: recentSuspects.map((row) => ({
        id: row.id,
        company: row.company,
        priorityScore: row.priorityScore,
        detectedTrigger: row.detectedTrigger,
        createdAt: row.createdAt.toISOString(),
      })),
    },
    briefings: {
      queueDrafts,
      published: publishedRows.map((row) => ({
        slug: row.slug,
        title: row.title,
        publishedAt: row.createdAt.toISOString(),
        tenantId: row.tenantId,
      })),
    },
    workforce,
    quickLinks: [
      { label: "Operations hub", href: "/dashboard/operations" },
      { label: "Ironboard console", href: workforce[0]?.consoleUrl ?? "http://127.0.0.1:8082/", external: true },
      { label: "Agent approvals", href: "/dashboard/admin/approvals" },
      { label: "Customer support console", href: "/dashboard/support" },
      { label: "Sales agent portal", href: "/sales-agent-portal" },
      { label: "Governance Frame (public)", href: "/governance-frame" },
      { label: "Op Support", href: "/opsupport" },
      { label: "Tenant onboarding", href: "/admin/onboarding" },
      { label: "Published briefings folder", href: `/docs/${PUBLISHED_BRIEFINGS_DIR}` },
    ],
  };
}
