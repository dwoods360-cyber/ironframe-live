import "server-only";

import {
  dbKeyToSlugSegments,
  listAppDocumentsForNavigation,
  type AppDocumentReadingLevel,
} from "@/app/lib/server/appDocumentStore";
import type { DocNavItem, DocNavSection } from "@/lib/docsNavigation";

const SECTION_LABELS: Record<string, string> = {
  "user-manuals": "Level 1 — End-user manuals",
  training: "Training tracks",
  technical: "Level 2 — Technical",
  "end-users": "End-users",
  support: "Support",
  qa: "QA",
  educators: "Educators",
  sales: "Sales",
  marketing: "Marketing",
  external: "External",
  stakeholders: "Stakeholders",
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
  "sales",
  "marketing",
  "external",
  "stakeholders",
  "root",
];

function sectionKeyForSlug(slug: string[]): string {
  if (slug.length === 1 && slug[0]?.toUpperCase() === "README") return "root-hub";
  if (slug.length === 1) return "root";
  const top = slug[0] ?? "root";
  if (SECTION_LABELS[top]) return top;
  return top;
}

function readingLevelBadge(level: AppDocumentReadingLevel): string {
  if (level === "LEVEL_1") return "Level 1";
  if (level === "TRAINING") return "Training";
  return "Level 2";
}

export async function buildAppDocsNavigation(): Promise<DocNavItem[]> {
  const rows = await listAppDocumentsForNavigation();
  const items: DocNavItem[] = rows.map((doc) => {
    const slug = dbKeyToSlugSegments(doc.slug);
    const section = sectionKeyForSlug(slug);
    const isHub = doc.slug === "readme";
    return {
      slug,
      href: isHub ? "/docs/README" : `/docs/${slug.join("/")}`,
      label: isHub
        ? "Documentation Center"
        : `${doc.title} (${readingLevelBadge(doc.readingLevel)})`,
      section,
      sectionLabel: SECTION_LABELS[section] ?? section,
    };
  });

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
  const groups = new Map<string, DocNavItem[]>();
  for (const item of items) {
    if (item.section === "root-hub") continue;
    const existing = groups.get(item.section) ?? [];
    existing.push(item);
    groups.set(item.section, existing);
  }

  const orderedKeys = [
    ...SECTION_ORDER.filter((key) => key !== "root-hub" && groups.has(key)),
    ...[...groups.keys()].filter((key) => !SECTION_ORDER.includes(key)).sort(),
  ];

  const hubItem = items.find((item) => item.section === "root-hub");
  const sections: DocNavSection[] = orderedKeys.map((key) => ({
    key,
    label: SECTION_LABELS[key] ?? key,
    items: groups.get(key) ?? [],
  }));

  if (hubItem) {
    return [{ key: "root-hub", label: "Documentation Center", items: [hubItem] }, ...sections];
  }
  return sections;
}
