/**
 * Master Doc Directory — map of documentation *planes* (not a dump of every .md).
 * Surfaced at /dashboard/operations/doc-directory.
 */

export type DocDirectoryPlane = {
  id: string;
  title: string;
  summary: string;
  href: string;
  /** Who this plane is for */
  audience: string;
  /** Optional external host */
  external?: boolean;
};

export const DOC_DIRECTORY_PLANES: DocDirectoryPlane[] = [
  {
    id: "operator-library",
    title: "Operator library (GTM)",
    summary:
      "Curated design-partner playbooks: pre-outreach, ICP shortlist, offer sheet, Control-to-Capital, battlecards.",
    href: "/dashboard/operations/library",
    audience: "Founder / GTM ops",
  },
  {
    id: "ops-surface-map",
    title: "Ops surface map",
    summary: "Which Ops screen does which job — daily 5-minute check, not a doc dump.",
    href: "/dashboard/operations/library/ops-surface-map",
    audience: "Founder / GTM ops",
  },
  {
    id: "product-docs",
    title: "Product / training docs",
    summary: "In-app manuals for partners and operators (APP_DOCS plane). Start at /docs/README.",
    href: "/docs",
    audience: "Partners · trainers · operators",
  },
  {
    id: "publishing",
    title: "Publishing Desk",
    summary: "GF quarantine desks: desk notes, briefings, newsletters, research, video, LinkedIn.",
    href: "/dashboard/operations/publishing",
    audience: "Publisher / founder",
  },
  {
    id: "research-public",
    title: "Governance Frame (public research)",
    summary: "Published briefings and research papers — institutional plane, not Path B pitch.",
    href: "https://research.ironframegrc.com",
    audience: "External readers",
    external: true,
  },
  {
    id: "resources-briefings",
    title: "Marketing briefing archive",
    summary: "Apex archive cards linking out to canonical research URLs.",
    href: "/resources/briefings",
    audience: "Public / marketing",
  },
  {
    id: "heatmap-amnesty",
    title: "Heatmap Amnesty landing",
    summary: "Priority-1 CISO/CFO Path B lane (later beachhead) — not MSSP cold default.",
    href: "/marketing/heatmap-amnesty",
    audience: "Public / later CISO lane",
  },
  {
    id: "partner-packet",
    title: "Design Partner operator packet",
    summary: "Partner handoff packet after Path B close — invite → cockpit → exports.",
    href: "/docs/user-manuals/design-partner-operator-packet",
    audience: "Paying co-builders",
  },
  {
    id: "repo-readme",
    title: "Repo docs README (filesystem registry)",
    summary:
      "Canonical markdown tree index in git. Open in the repo: docs/README.md · Sales section also in docs/hub.md.",
    href: "/docs/README",
    audience: "Engineers · deep search",
  },
];
