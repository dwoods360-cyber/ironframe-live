import "server-only";

/**
 * Operations Command Center snapshot — Ironframe-internal surface for GLOBAL_ADMIN
 * or designated BUSINESS_ADMIN operators. Perimeter workforce apps (:8082–:8086)
 * are never mounted in tenant workspaces.
 */

import fs from "fs";
import path from "path";

import type { IronboardLeadStage } from "@prisma/client";

import {
  fetchPendingApprovalDrafts,
  type DraftKind,
} from "@/app/lib/server/approvalQueueCore";
import {
  collapseSuspectRowsByCompany,
  purgeDuplicateSuspectContacts,
} from "@/app/lib/server/dedupeIronleadsSuspectsCore";
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
import { syndicatePublishedBriefing } from "@/app/lib/governanceFrame/publishBriefingSyndication";
import { IRONBOARD_OPERATIONS_PORTAL_PATH } from "@/app/lib/ironboardConsolePaths";
import { listDeniedBriefingFilenames } from "@/app/lib/server/denyBriefingQueueDraftCore";
import prisma from "@/lib/prisma";

export type WorkforceServiceId =
  | "ironboard"
  | "ironleads"
  | "salesteam"
  | "success-team"
  | "support-team";

/** Authoritative operations-hub workforce probe order (must match buildOperationsHubSnapshot). */
export const OPERATIONS_HUB_WORKFORCE_IDS: readonly WorkforceServiceId[] = [
  "ironboard",
  "ironleads",
  "salesteam",
  "success-team",
  "support-team",
] as const;

export type WorkforceServiceStatus = {
  id: WorkforceServiceId;
  label: string;
  port: number;
  healthUrl: string;
  consoleUrl: string | null;
  /** Operator interaction portal on Ironframe control plane (when not the worker root). */
  portalUrl: string | null;
  role: string;
  reachable: boolean;
  status: string | null;
  latencyMs: number | null;
};

export type BriefingQueueDraftSummary = {
  filename: string;
  title: string;
  /** Short body preview for Ops Hub approve/deny desks. */
  summary: string;
  modifiedAt: string;
  promotable: boolean;
  requiresImmediatePromotion: boolean;
  validationOk: boolean;
  issues: BriefingDraftValidationIssue[];
};

export type NewsletterEditionSummary = {
  slug: string;
  title: string;
  publishedAt: string;
  syndicated: boolean;
  htmlPath: string | null;
  htmlModifiedAt: string | null;
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
  newsletters: {
    rssFeedUrl: string;
    rssItemCount: number | null;
    compiledCount: number;
    pendingSyndicationCount: number;
    editions: NewsletterEditionSummary[];
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
      portalUrl: null,
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
      portalUrl: null,
      role,
      reachable: false,
      status: null,
      latencyMs: Date.now() - started,
    };
  }
}

function extractDraftSummary(markdown: string): string {
  const withoutFrontmatter = markdown.replace(/^---[\s\S]*?---\s*/m, "").trim();
  const summaryMatch = withoutFrontmatter.match(
    /(?:\*\*)?Executive Summary:?\*?\*?\s*:?\s*([\s\S]*?)(?=\n#{1,3}\s|\n###|\n##|\n\*\*I\.|\nI\.\s|$)/i,
  );
  const raw = (summaryMatch?.[1] ?? withoutFrontmatter).replace(/\s+/g, " ").trim();
  if (raw.length <= 280) return raw;
  return `${raw.slice(0, 277).trimEnd()}…`;
}

async function listBriefingQueueDrafts(docsRoot: string): Promise<BriefingQueueDraftSummary[]> {
  const queueDir = path.join(docsRoot, BRIEFING_QUEUE_DIR);
  if (!fs.existsSync(queueDir)) return [];

  const denied = await listDeniedBriefingFilenames();

  return fs
    .readdirSync(queueDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .filter((entry) => !QUARANTINE_ALLOWLIST.has(entry.name.toLowerCase()))
    .filter((entry) => !denied.has(entry.name))
    .map((entry) => {
      const filePath = path.join(queueDir, entry.name);
      const markdown = fs.readFileSync(filePath, "utf-8");
      const stat = fs.statSync(filePath);
      const validation = validateBriefingQueueDraft(entry.name, markdown);
      const alertFlags = parseBriefingDraftAlertFlags(markdown);
      return {
        filename: entry.name,
        title: parseTitleFromMarkdown(markdown, entry.name),
        summary: extractDraftSummary(markdown),
        modifiedAt: stat.mtime.toISOString(),
        promotable: !isNonPromotableBriefingDraft(entry.name),
        requiresImmediatePromotion: alertFlags.requiresImmediatePromotion,
        validationOk: validation.ok,
        issues: validation.issues,
      };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

function resolveNewsletterArtifactDirs(docsRoot: string): string[] {
  const cwd = process.cwd();
  const dirs = [
    path.join(docsRoot, "newsletters"),
    path.join(cwd, "out", "governance-frame", "newsletters"),
    path.join(cwd, "public", "governance-frame", "newsletters"),
  ];
  return [...new Set(dirs)];
}

function findNewsletterHtmlArtifact(
  slug: string,
  dirs: string[],
): { htmlPath: string; htmlModifiedAt: string } | null {
  for (const dir of dirs) {
    const filePath = path.join(dir, `${slug}.html`);
    if (!fs.existsSync(filePath)) continue;
    const stat = fs.statSync(filePath);
    return { htmlPath: filePath, htmlModifiedAt: stat.mtime.toISOString() };
  }
  return null;
}

function countPublicRssItems(): number | null {
  const rssPath = path.join(process.cwd(), "public", "rss.xml");
  if (!fs.existsSync(rssPath)) return null;
  const xml = fs.readFileSync(rssPath, "utf8");
  return (xml.match(/<item\b/gi) ?? []).length;
}

function buildNewslettersSnapshot(
  published: Array<{ slug: string; title: string; publishedAt: string }>,
  docsRoot: string,
): OperationsHubSnapshot["newsletters"] {
  const artifactDirs = resolveNewsletterArtifactDirs(docsRoot);
  const editions: NewsletterEditionSummary[] = published.map((row) => {
    const artifact = findNewsletterHtmlArtifact(row.slug, artifactDirs);
    return {
      slug: row.slug,
      title: row.title,
      publishedAt: row.publishedAt,
      syndicated: Boolean(artifact),
      htmlPath: artifact?.htmlPath ?? null,
      htmlModifiedAt: artifact?.htmlModifiedAt ?? null,
    };
  });

  const compiledCount = editions.filter((row) => row.syndicated).length;

  return {
    rssFeedUrl: "/rss.xml",
    rssItemCount: countPublicRssItems(),
    compiledCount,
    pendingSyndicationCount: editions.length - compiledCount,
    editions,
  };
}

export async function syndicateNewsletterForSlug(
  slug: string,
  docsRoot = resolveDocsRoot(),
): Promise<{ slug: string; newsletterHtmlPath: string | null; rssPath: string }> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || normalized.includes("..") || normalized.includes("/")) {
    throw new Error("Invalid slug.");
  }
  const newsletterOutputDir = path.join(docsRoot, "newsletters");
  fs.mkdirSync(newsletterOutputDir, { recursive: true });
  const result = syndicatePublishedBriefing(normalized, docsRoot, {
    newsletterOutputDir,
  });
  return {
    slug: normalized,
    newsletterHtmlPath: result.newsletterHtmlPath,
    rssPath: result.rssPath,
  };
}

export async function buildOperationsHubSnapshot(): Promise<OperationsHubSnapshot> {
  await purgeDuplicateSuspectContacts();

  const [drafts, dealGroups, contactCount, recentSuspectsRaw, publishedRows, workforce] =
    await Promise.all([
      fetchPendingApprovalDrafts(),
      prisma.ironboardCrmDeal.groupBy({
        by: ["stage"],
        _count: { _all: true },
      }),
      prisma.ironboardCrmContact.count(),
      prisma.ironboardCrmContact.findMany({
        where: { primaryDeals: { some: { stage: "SUSPECT" } } },
        orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
        take: 40,
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
        probeWorkerHealth(
          "support-team",
          "IronSupportTeam",
          8086,
          "OPERATIONS_SUPPORT_TEAM_URL",
          "Support intake reply drafts → SUPPORT approval queue",
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
  const queueDrafts = await listBriefingQueueDrafts(docsRoot);
  const publishedBriefings = publishedRows.map((row) => ({
    slug: row.slug,
    title: row.title,
    publishedAt: row.createdAt.toISOString(),
    tenantId: row.tenantId,
  }));
  const newsletters = buildNewslettersSnapshot(publishedBriefings, docsRoot);
  const recentSuspects = collapseSuspectRowsByCompany(recentSuspectsRaw).slice(0, 8);

  const portalUrls: Record<WorkforceServiceId, string | null> = {
    ironboard: IRONBOARD_OPERATIONS_PORTAL_PATH,
    ironleads: "/dashboard/operations/ironleads",
    salesteam: "/dashboard/operations/salesteam",
    "success-team": "/dashboard/operations/success-team",
    "support-team": "/dashboard/operations/support-intake",
  };

  const workforceWithPortals = workforce.map((service) => ({
    ...service,
    portalUrl: portalUrls[service.id],
  }));

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
      published: publishedBriefings,
    },
    newsletters,
    workforce: workforceWithPortals,
    quickLinks: [
      { label: "Operations hub", href: "/dashboard/operations" },
      { label: "Ironboard console", href: IRONBOARD_OPERATIONS_PORTAL_PATH },
      { label: "Agent approvals", href: "/dashboard/admin/approvals" },
      { label: "Support intake console", href: "/dashboard/operations/support-intake" },
      { label: "Ironleads portal", href: "/dashboard/operations/ironleads" },
      { label: "SalesTeam portal", href: "/dashboard/operations/salesteam" },
      { label: "Public sales funnel", href: "/sales-agent-portal" },
      { label: "IronSuccessTeam portal", href: "/dashboard/operations/success-team" },
      { label: "Governance Frame (public)", href: "/governance-frame" },
      { label: "Governance Frame RSS", href: "/rss.xml" },
      { label: "Op Support", href: "/opsupport" },
      { label: "Tenant onboarding", href: "/admin/onboarding" },
      { label: "Tenant billing console", href: "/admin/billing" },
      { label: "Published briefings folder", href: `/docs/${PUBLISHED_BRIEFINGS_DIR}` },
    ],
  };
}
