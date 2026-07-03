import "server-only";

import {
  dbKeyToSlugSegments,
  findAppDocumentBySlug,
  listAppDocumentSlugs,
  type AppDocumentReadingLevel,
} from "@/app/lib/server/appDocumentStore";
import {
  groupDocsNavigation,
  type DocNavItem,
  type DocNavSection,
} from "@/lib/docsNavigation";

const SECTION_LABELS: Record<string, string> = {
  "user-manuals": "Level 1 — End-user manuals",
  training: "Training tracks",
  technical: "Level 2 — Technical",
  "end-users": "End-users",
  support: "Support",
  qa: "QA",
  educators: "Educators",
  root: "Engineering & operations",
  "root-hub": "Documentation Center",
};

const SECTION_ORDER = [
  "root-hub",
  "user-manuals",
  "training",
  "technical",
  "end-users",
  "support",
  "qa",
  "educators",
  "root",
];

function sectionKeyForSlug(slug: string[]): string {
  if (slug.length === 1 && slug[0]?.toUpperCase() === "README") return "root-hub";
  if (slug.length === 1) return "root";
  if (slug[0] === "user-manuals") return "user-manuals";
  if (slug[0] === "technical") return "technical";
  if (slug[0] === "training") return "training";
  if (slug[0] === "qa") return "qa";
  if (slug[0] === "educators") return "educators";
  return slug[0] ?? "root";
}

function readingLevelBadge(level: AppDocumentReadingLevel): string {
  if (level === "LEVEL_1") return "Level 1";
  if (level === "TRAINING") return "Training";
  return "Level 2";
}

export async function buildAppDocsNavigation(): Promise<DocNavItem[]> {
  const slugs = await listAppDocumentSlugs();
  const items: DocNavItem[] = [];

  for (const dbSlug of slugs) {
    const doc = await findAppDocumentBySlug(dbSlug);
    if (!doc) continue;
    const slug = dbKeyToSlugSegments(dbSlug);
    const section = sectionKeyForSlug(slug);
    const label =
      dbSlug === "readme"
        ? "Documentation Center"
        : `${doc.title} (${readingLevelBadge(doc.readingLevel)})`;

    items.push({
      slug,
      href: `/docs/${slug.join("/")}`,
      label: dbSlug === "readme" ? "Documentation Center" : label,
      section,
      sectionLabel: SECTION_LABELS[section] ?? section,
    });
  }

  return items.sort((a, b) => {
    const orderA = SECTION_ORDER.indexOf(a.section);
    const orderB = SECTION_ORDER.indexOf(b.section);
    const rankA = orderA === -1 ? SECTION_ORDER.length : orderA;
    const rankB = orderB === -1 ? SECTION_ORDER.length : orderB;
    if (rankA !== rankB) return rankA - rankB;
    return a.label.localeCompare(b.label);
  });
}

export async function groupAppDocsNavigation(items: DocNavItem[]): Promise<DocNavSection[]> {
  const hubItem = items.find((item) => item.section === "root-hub");
  const grouped = groupDocsNavigation(items);
  if (hubItem) {
    return [{ key: "root-hub", label: "Documentation Center", items: [hubItem] }, ...grouped];
  }
  return grouped;
}
