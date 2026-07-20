import "server-only";

import fs from "fs";
import path from "path";

import { BRIEFING_QUEUE_DIR, resolveDocsRoot } from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import { requestGovernanceBriefingSeriesCore } from "@/app/lib/server/requestGovernanceBriefingSeriesCore";
import { requestGovernanceNewsletterSeriesCore } from "@/app/lib/server/requestGovernanceNewsletterSeriesCore";
import prisma from "@/lib/prisma";

export type AutonomousGtmTopic = {
  id: string;
  briefingTitle: string;
  briefingPrompt: string;
  briefingEraLabel: string;
  briefingYearRange: string;
  newsletterTitle: string;
  newsletterPrompt: string;
  newsletterIssueLabel: string;
  newsletterFocus: string;
};

/** Rotating public GTM topics — quarantine only; never auto-promote. */
export const AUTONOMOUS_GTM_TOPICS: readonly AutonomousGtmTopic[] = [
  {
    id: "heatmap-vs-dollars",
    briefingTitle: "Board risk in dollars, not heatmaps",
    briefingPrompt:
      "Autonomous weekly briefing: explain why regulated operators still lose the GRC loop when boards receive color charts instead of defensible dollar risk, and how a quantitative command post with tenant isolation changes the buying decision. Quarantine draft only — do not promote.",
    briefingEraLabel: "Current market pressure",
    briefingYearRange: "2024–2026",
    newsletterTitle: "Ironcast — dollars over heatmaps",
    newsletterPrompt:
      "Autonomous Ironcast newsletter issue on why spreadsheet and heatmap GRC fails board accountability, and why a paid co-builder Path B seat exists for operators who need quantified risk. No implementation internals. Quarantine only.",
    newsletterIssueLabel: "Dollars over heatmaps",
    newsletterFocus:
      "Board-grade financial risk defensibility versus qualitative compliance theater.",
  },
  {
    id: "tenant-sovereignty",
    briefingTitle: "Tenant sovereignty for multi-entity operators",
    briefingPrompt:
      "Autonomous weekly briefing: multi-entity holding companies, MSSPs, and utilities need hard audit boundaries. Position Ironframe on isolated enclaves and governed exports — not connector count. Quarantine draft only.",
    briefingEraLabel: "Multi-entity isolation",
    briefingYearRange: "2019–2026",
    newsletterTitle: "Ironcast — enclaves without cross-bleed",
    newsletterPrompt:
      "Autonomous Ironcast newsletter on tenant sovereignty for multi-client / multi-affiliate operators. Emphasize isolation and export as deliverable. Quarantine only.",
    newsletterIssueLabel: "Enclaves without cross-bleed",
    newsletterFocus:
      "Why hard tenant walls matter for MSSPs and portfolio operators.",
  },
  {
    id: "design-partner-cohort",
    briefingTitle: "Paid design partners beat free pilots",
    briefingPrompt:
      "Autonomous weekly briefing: why a small paid Path B co-builder cohort ($4,999, 90-day window, 2–3 success criteria) produces referenceable outcomes while free pilots rarely log in. Quarantine draft only.",
    briefingEraLabel: "Design-partner commercial posture",
    briefingYearRange: "2025–2026",
    newsletterTitle: "Ironcast — co-builder seats, not free betas",
    newsletterPrompt:
      "Autonomous Ironcast newsletter inviting thoughtful operators into a paid co-builder window with workflow-review CTA — never a free forever pilot. Quarantine only.",
    newsletterIssueLabel: "Co-builder seats",
    newsletterFocus:
      "Paid Path B on-ramp, capped eng syncs, convert-or-exit discipline.",
  },
  {
    id: "audit-evidence-pain",
    briefingTitle: "Evidence pain and questionnaire drag",
    briefingPrompt:
      "Autonomous weekly briefing on auditor evidence export and enterprise questionnaire friction as the wedge for a quantitative GRC command post. Cite only general industry patterns with Section V sources. Quarantine draft only.",
    briefingEraLabel: "Evidence operations",
    briefingYearRange: "2020–2026",
    newsletterTitle: "Ironcast — evidence without spreadsheet decay",
    newsletterPrompt:
      "Autonomous Ironcast newsletter for CISOs drowning in questionnaires and stale evidence workbooks. Soft Ironframe solution bridge only. Quarantine only.",
    newsletterIssueLabel: "Evidence without decay",
    newsletterFocus:
      "Auditor-ready exports and governed evidence paths versus swivel-chair labor.",
  },
  {
    id: "vanta-complement",
    briefingTitle: "Automation floor vs financial defensibility",
    briefingPrompt:
      "Autonomous weekly briefing: honest category split — continuous control automation (Vanta/Drata class) versus Ironframe financial-risk defensibility and tenant sovereignty. No false certifications. Quarantine draft only.",
    briefingEraLabel: "Category design",
    briefingYearRange: "2022–2026",
    newsletterTitle: "Ironcast — different buying jobs",
    newsletterPrompt:
      "Autonomous Ironcast newsletter explaining when checklist automation is enough and when boards need dollar-denominated risk in isolated enclaves. Quarantine only.",
    newsletterIssueLabel: "Different buying jobs",
    newsletterFocus:
      "Complement vs replace: speed-to-cert tools versus quantitative command posts.",
  },
] as const;

export function utcCalendarDateLabel(input = new Date()): string {
  return input.toISOString().slice(0, 10);
}

export function pickAutonomousGtmTopic(input = new Date()): AutonomousGtmTopic {
  const y = input.getUTCFullYear();
  const start = Date.UTC(y, 0, 0);
  const dayOfYear = Math.floor(
    (Date.UTC(y, input.getUTCMonth(), input.getUTCDate()) - start) / 86_400_000,
  );
  const index = ((dayOfYear % AUTONOMOUS_GTM_TOPICS.length) + AUTONOMOUS_GTM_TOPICS.length) %
    AUTONOMOUS_GTM_TOPICS.length;
  return AUTONOMOUS_GTM_TOPICS[index]!;
}

export function buildAutonomousDraftFilenames(
  dateLabel: string,
  topic: AutonomousGtmTopic,
): { briefing: string; newsletter: string } {
  return {
    briefing: `${dateLabel}-draft-auto-briefing-${topic.id}.md`,
    newsletter: `${dateLabel}-draft-auto-newsletter-${topic.id}.md`,
  };
}

function queuePath(filename: string): string {
  return path.join(resolveDocsRoot(), BRIEFING_QUEUE_DIR, filename);
}

function draftAlreadyQueued(filename: string): boolean {
  return fs.existsSync(queuePath(filename));
}

async function resolveFrontmatterTenant(): Promise<{ id: string; slug: string }> {
  const preferred =
    process.env.GTM_BRIEFING_QUEUE_TENANT_SLUG?.trim().toLowerCase() || "ironframe-sandbox";
  const tenant =
    (await prisma.tenant.findFirst({
      where: { slug: preferred },
      select: { id: true, slug: true },
    })) ||
    (await prisma.tenant.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true },
    }));
  if (!tenant) {
    throw new Error("No tenant available for autonomous GTM briefing frontmatter.");
  }
  return tenant;
}

export type AutonomousGtmBriefingQueueResult = {
  ok: boolean;
  skipped: boolean;
  dateLabel: string;
  topicId: string;
  staged: string[];
  skippedExisting: string[];
  failed: Array<{ filename: string; error: string }>;
  artifactId?: string;
};

/**
 * Nightly/weekly autonomous authorship → docs/briefing-queue/ only.
 * Never promotes, syndicates, or emails the public.
 */
export async function runAutonomousGtmBriefingQueue(
  now = new Date(),
): Promise<AutonomousGtmBriefingQueueResult> {
  if (process.env.GTM_BRIEFING_QUEUE_CRON_ENABLED?.trim().toLowerCase() === "false") {
    return {
      ok: true,
      skipped: true,
      dateLabel: utcCalendarDateLabel(now),
      topicId: "disabled",
      staged: [],
      skippedExisting: [],
      failed: [],
    };
  }

  const dateLabel = utcCalendarDateLabel(now);
  const topic = pickAutonomousGtmTopic(now);
  const files = buildAutonomousDraftFilenames(dateLabel, topic);
  const skippedExisting: string[] = [];
  const staged: string[] = [];
  const failed: AutonomousGtmBriefingQueueResult["failed"] = [];

  const needBriefing = !draftAlreadyQueued(files.briefing);
  const needNewsletter = !draftAlreadyQueued(files.newsletter);
  if (!needBriefing) skippedExisting.push(files.briefing);
  if (!needNewsletter) skippedExisting.push(files.newsletter);

  if (!needBriefing && !needNewsletter) {
    return {
      ok: true,
      skipped: true,
      dateLabel,
      topicId: topic.id,
      staged: [],
      skippedExisting,
      failed: [],
    };
  }

  const tenant = await resolveFrontmatterTenant();

  if (needBriefing) {
    const briefing = await requestGovernanceBriefingSeriesCore({
      requestPrompt: topic.briefingPrompt,
      seriesTitle: topic.briefingTitle,
      eras: [
        {
          filename: files.briefing,
          eraLabel: topic.briefingEraLabel,
          yearRange: topic.briefingYearRange,
        },
      ],
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      overwrite: false,
    });
    staged.push(...briefing.staged.map((row) => row.filename));
    failed.push(...briefing.failed);
  }

  if (needNewsletter) {
    const newsletter = await requestGovernanceNewsletterSeriesCore({
      requestPrompt: topic.newsletterPrompt,
      seriesTitle: topic.newsletterTitle,
      issues: [
        {
          filename: files.newsletter,
          issueLabel: topic.newsletterIssueLabel,
          focus: topic.newsletterFocus,
        },
      ],
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      overwrite: false,
    });
    staged.push(...newsletter.staged.map((row) => row.filename));
    failed.push(...newsletter.failed);
  }

  if (staged.length > 0) {
    const { ensureQueueReviewActivity } = await import("@/app/lib/server/opsScheduleCore");
    await Promise.all(
      staged.map((filename) =>
        ensureQueueReviewActivity({ filename }).catch((err) => {
          console.warn("[gtm-briefing-queue] schedule activity skipped", filename, err);
        }),
      ),
    );
  }

  const artifact = await prisma.cronJobArtifact.create({
    data: {
      tenantId: tenant.id,
      agentName: "gtm-briefing-queue-autonomous",
      payloadJson: {
        dateLabel,
        topicId: topic.id,
        staged,
        skippedExisting,
        failed,
        source: "api-cron-gtm-briefing-queue",
        publishState: "QUARANTINED_AWAITING_OPERATOR",
      },
    },
    select: { id: true },
  });

  return {
    ok: failed.length === 0 && staged.length > 0,
    skipped: false,
    dateLabel,
    topicId: topic.id,
    staged,
    skippedExisting,
    failed,
    artifactId: artifact.id,
  };
}
