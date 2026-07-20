/**
 * Curated operator document directory for Ops Hub → Library.
 * Markdown entries resolve under docs/sales via the library [slug] reader.
 */

export type OperatorLibraryLink =
  | {
      kind: "markdown";
      slug: string;
      title: string;
      summary: string;
      /** Basename under docs/<docsRoot>/ */
      file: string;
      /** Default sales. Use qa for internal feature glossary. */
      docsRoot?: "sales" | "qa";
    }
  | {
      kind: "href";
      slug: string;
      title: string;
      summary: string;
      href: string;
      external?: boolean;
    };

export type OperatorLibrarySet = {
  id: string;
  title: string;
  summary: string;
  items: OperatorLibraryLink[];
};

export const OPERATOR_LIBRARY_SETS: OperatorLibrarySet[] = [
  {
    id: "glossary",
    title: "Glossary & terms",
    summary: "Definitions for operators and the partner-facing glossary.",
    items: [
      {
        kind: "markdown",
        slug: "gtm-operator-glossary",
        title: "GTM operator glossary",
        summary:
          "SUSPECT → Path B, DISPATCH, LIVE sidecar, message locks, banned language.",
        file: "design-partner-gtm-operator-glossary.md",
      },
      {
        kind: "href",
        slug: "partner-glossary",
        title: "Partner plain-English glossary (/docs)",
        summary: "ALE, Path B, WORM, billing gate — language safe to use with partners.",
        href: "/docs/user-manuals/glossary",
        external: true,
      },
      {
        kind: "markdown",
        slug: "qa-feature-glossary",
        title: "QA complete feature glossary",
        summary: "Internal screen/lab encyclopedia (large). Not for partner calls.",
        file: "complete-feature-glossary.md",
        docsRoot: "qa",
      },
    ],
  },
  {
    id: "pre-outreach",
    title: "Pre-outreach & launch",
    summary: "Dry-run gates and batch send cadence before partner DISPATCH.",
    items: [
      {
        kind: "markdown",
        slug: "pre-outreach-run-order",
        title: "Pre-outreach dry-run (run order)",
        summary: "R1–R8 click-through. Hard gates before first real send.",
        file: "design-partner-pre-outreach-run-order.md",
      },
      {
        kind: "markdown",
        slug: "operator-launch-checklist",
        title: "Operator launch checklist",
        summary: "Batch build + per-prospect send + close/provision cadence.",
        file: "design-partner-operator-launch-checklist.md",
      },
      {
        kind: "markdown",
        slug: "outreach-sequence",
        title: "Outreach sequence",
        summary: "Touch 1–3 cadence and message intent.",
        file: "design-partner-outreach-sequence.md",
      },
      {
        kind: "markdown",
        slug: "icp-shortlist",
        title: "ICP shortlist",
        summary: "Attack order and prospect slots.",
        file: "design-partner-icp-shortlist.md",
      },
      {
        kind: "markdown",
        slug: "recruitment",
        title: "Recruitment runbook",
        summary: "How design partners are recruited into Path B.",
        file: "design-partner-recruitment.md",
      },
    ],
  },
  {
    id: "on-the-call",
    title: "On the call",
    summary: "Host talk track + LIVE sidecar tools.",
    items: [
      {
        kind: "href",
        slug: "workflow-review-protocol",
        title: "Workflow review talk track",
        summary: "15-minute peer-to-peer diligence protocol (printable).",
        href: "/operator/workflow-review-protocol.html",
        external: true,
      },
      {
        kind: "markdown",
        slug: "workflow-review-protocol-md",
        title: "Workflow review protocol (markdown)",
        summary: "Same protocol in repo markdown form.",
        file: "design-partner-workflow-review-protocol.md",
      },
      {
        kind: "href",
        slug: "workflow-review-live",
        title: "LIVE call assist (tool)",
        summary: "Mic STT, Pocket Q&A, End LIVE → recap, Push to calendar.",
        href: "/dashboard/operations/workflow-review",
      },
      {
        kind: "markdown",
        slug: "workforce-briefing",
        title: "Workforce briefing",
        summary: "Perimeter worker roles around the design-partner motion.",
        file: "design-partner-workforce-briefing.md",
      },
    ],
  },
  {
    id: "path-b-close",
    title: "Path B close & commercial",
    summary: "Offer, order form, pricing locks.",
    items: [
      {
        kind: "markdown",
        slug: "offer-sheet",
        title: "Offer sheet",
        summary: "$4,999 · 90-day Path B commercial frame.",
        file: "design-partner-offer-sheet.md",
      },
      {
        kind: "markdown",
        slug: "order-form",
        title: "Order form",
        summary: "2–3 success criteria + provision inputs.",
        file: "design-partner-order-form.md",
      },
      {
        kind: "markdown",
        slug: "pricing-packaging",
        title: "Pricing & packaging",
        summary: "Packaging narrative for operators.",
        file: "pricing-and-packaging.md",
      },
      {
        kind: "href",
        slug: "path-b-onboarding",
        title: "Path B onboarding (tool)",
        summary: "Provision with client-owned operator email.",
        href: "/admin/onboarding",
      },
    ],
  },
  {
    id: "enablement",
    title: "Enablement & battlecards",
    summary: "Competitive and sales enablement reading.",
    items: [
      {
        kind: "markdown",
        slug: "sales-enablement",
        title: "Sales enablement",
        summary: "Operator talking points and enablement notes.",
        file: "sales-enablement.md",
      },
      {
        kind: "markdown",
        slug: "battlecard-vanta-drata",
        title: "Battlecard vs Vanta / Drata",
        summary: "Differentiation locks for diligence calls.",
        file: "battlecard-ironframe-vs-vanta-drata.md",
      },
      {
        kind: "markdown",
        slug: "competitive-analysis",
        title: "Competitive analysis",
        summary: "Broader competitive landscape notes.",
        file: "competitive-analysis.md",
      },
      {
        kind: "markdown",
        slug: "market-entrance",
        title: "Market entrance playbook",
        summary: "GTM entrance framing.",
        file: "market-entrance-playbook.md",
      },
      {
        kind: "markdown",
        slug: "target-market",
        title: "Target market research",
        summary: "ICP / beachhead research backing.",
        file: "target-market-research.md",
      },
    ],
  },
  {
    id: "ops-tools",
    title: "Ops Hub tools",
    summary: "Execution surfaces (not documents).",
    items: [
      {
        kind: "href",
        slug: "approvals-sales",
        title: "Approvals — SALES",
        summary: "Edit drafts and DISPATCH.",
        href: "/dashboard/admin/approvals?kind=SALES",
      },
      {
        kind: "href",
        slug: "ironleads",
        title: "Ironleads portal",
        summary: "SUSPECT harvest and reports.",
        href: "/dashboard/operations/ironleads",
      },
      {
        kind: "href",
        slug: "salesteam",
        title: "SalesTeam portal",
        summary: "Poll / draft generation.",
        href: "/dashboard/operations/salesteam",
      },
      {
        kind: "href",
        slug: "calendar",
        title: "Ops calendar",
        summary: "WF-review action items after Push to calendar.",
        href: "/dashboard/operations?tab=calendar",
      },
      {
        kind: "href",
        slug: "partner-packet",
        title: "Partner operator packet (/docs)",
        summary: "What partners receive after Path B — seeded docs corpus.",
        href: "/docs/user-manuals/design-partner-operator-packet",
        external: true,
      },
    ],
  },
];

export function listMarkdownLibraryEntries(): Array<{
  slug: string;
  title: string;
  file: string;
  summary: string;
  docsRoot: "sales" | "qa";
}> {
  const out: Array<{
    slug: string;
    title: string;
    file: string;
    summary: string;
    docsRoot: "sales" | "qa";
  }> = [];
  for (const set of OPERATOR_LIBRARY_SETS) {
    for (const item of set.items) {
      if (item.kind === "markdown") {
        out.push({
          slug: item.slug,
          title: item.title,
          file: item.file,
          summary: item.summary,
          docsRoot: item.docsRoot ?? "sales",
        });
      }
    }
  }
  return out;
}

export function resolveMarkdownLibraryEntry(slug: string): {
  slug: string;
  title: string;
  file: string;
  summary: string;
  docsRoot: "sales" | "qa";
} | null {
  const hit = listMarkdownLibraryEntries().find((e) => e.slug === slug);
  return hit ?? null;
}
